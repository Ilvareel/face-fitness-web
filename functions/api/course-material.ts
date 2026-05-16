import type { D1Database, PagesFunction, R2Bucket } from "@cloudflare/workers-types";

type Env = {
  DB: D1Database;
  COURSE_ACCESS_SECRET: string;
  COURSE_MATERIALS: R2Bucket;
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

function isSafeMaterialId(materialId: string): boolean {
  return /^[a-z0-9-]+$/.test(materialId);
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const materialId = new URL(context.request.url).searchParams.get("id");

  if (!materialId || !isSafeMaterialId(materialId)) {
    return new Response("Invalid material id", { status: 400 });
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

  const object = await context.env.COURSE_MATERIALS.get(`materials/${materialId}.html`);

  if (!object) {
    return new Response("Material not found", { status: 404 });
  }

  return new Response(await object.text(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
};