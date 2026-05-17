import type { D1Database, PagesFunction } from "@cloudflare/workers-types";

type Env = {
  DB: D1Database;
  COURSE_ACCESS_SECRET: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_STREAM_API_TOKEN: string;
  CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN: string;
};

const COOKIE_NAME = "fvh_course_access";

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(";")) {
    const trimmed = cookie.trim();

    if (trimmed.startsWith(`${name}=`)) {
      return decodeURIComponent(trimmed.slice(name.length + 1));
    }
  }

  return null;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(digest);
}

async function verifyAccessCookie(cookieValue: string, secret: string): Promise<string | null> {
  const parts = cookieValue.split("|");
  if (parts.length !== 3) return null;

  const [emailEncoded, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);

  if (!emailEncoded || !Number.isFinite(expiresAt)) return null;
  if (Date.now() > expiresAt) return null;

  const payload = `${emailEncoded}|${expiresAtRaw}`;
  const expectedSignature = await signPayload(payload, secret);

  if (!safeEqual(signature, expectedSignature)) return null;

  return decodeURIComponent(emailEncoded);
}

function isSafeVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(videoId);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const videoId = url.searchParams.get("videoId");

  if (!videoId || !isSafeVideoId(videoId)) {
    return new Response("Invalid video id", { status: 400 });
  }

  const cookieValue = parseCookie(context.request.headers.get("cookie"), COOKIE_NAME);

  if (!cookieValue) {
    return new Response("Unauthorized", { status: 401 });
  }

  const emailNormalized = await verifyAccessCookie(
    cookieValue,
    context.env.COURSE_ACCESS_SECRET
  );

  if (!emailNormalized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const customer = await context.env.DB.prepare(
    `SELECT status FROM paid_customers WHERE email_normalized = ? LIMIT 1`
  )
    .bind(emailNormalized)
    .first<{ status: string }>();

  if (customer?.status !== "paid") {
    return new Response("Unauthorized", { status: 401 });
  }

  const tokenResponse = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${context.env.CLOUDFLARE_ACCOUNT_ID}/stream/${videoId}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.CLOUDFLARE_STREAM_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      }),
    }
  );

  if (!tokenResponse.ok) {
    return new Response("Could not create video token", { status: 502 });
  }

  const tokenData = await tokenResponse.json<{
    success: boolean;
    result?: { token?: string };
  }>();

  const token = tokenData.result?.token;

  if (!tokenData.success || !token) {
    return new Response("Could not create video token", { status: 502 });
  }

  const streamHost = context.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN.replace(
    /^https?:\/\//,
    ""
  );

  const iframeSrc = `https://${streamHost}/${encodeURIComponent(token)}/iframe`;

  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Protected video</title>
    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #000;
      }

      iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${escapeHtml(iframeSrc)}"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
      allowfullscreen
    ></iframe>
  </body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    }
  );
};