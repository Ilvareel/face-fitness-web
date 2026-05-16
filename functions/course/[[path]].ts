import type { D1Database, PagesFunction } from "@cloudflare/workers-types";
import { courseLessons } from "../../src/course-data/course";
import { renderDashboard } from "../../src/course-renderers/dashboard";
import { renderLessonPage } from "../../src/course-renderers/lesson-page";
import { escapeHtml } from "../../src/course-renderers/utils";

type Env = {
  DB: D1Database;
  COURSE_ACCESS_SECRET?: string;
};

type RequestLike = {
  headers: {
    get(name: string): string | null;
  };
};

const COOKIE_NAME = "fvh_course_access";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 48; // 48 hours

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return email.length > 3 && email.length < 254 && email.includes("@");
}

function html(body: string, status = 200, headers: HeadersInit = {}): any {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function redirect(location: string, headers: HeadersInit = {}): any {
  return new Response(null, {
    status: 303,
    headers: {
      location,
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function getCookie(request: RequestLike, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
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

async function createAccessCookie(emailNormalized: string, secret: string): Promise<string> {
  const expiresAt = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
  const emailEncoded = encodeURIComponent(emailNormalized);
  const payload = `${emailEncoded}|${expiresAt}`;
  const signature = await signPayload(payload, secret);

  return `${payload}|${signature}`;
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

async function isPaidCustomer(db: D1Database, emailNormalized: string): Promise<boolean> {
  const customer = await db
    .prepare(
      `SELECT status
       FROM paid_customers
       WHERE email_normalized = ?
       LIMIT 1`
    )
    .bind(emailNormalized)
    .first<{ status: string }>();

  return customer?.status === "paid";
}

async function logAccessAttempt(
  db: D1Database,
  request: RequestLike,
  emailNormalized: string,
  success: boolean
): Promise<void> {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  const ipHash = await sha256Hex(ip);
  const userAgentHash = await sha256Hex(userAgent);

  await db
    .prepare(
      `INSERT INTO access_logs (email_normalized, success, ip_hash, user_agent_hash)
       VALUES (?, ?, ?, ?)`
    )
    .bind(emailNormalized, success ? 1 : 0, ipHash, userAgentHash)
    .run();
}

function getCoursePath(requestUrl: string): string {
  const url = new URL(requestUrl);
  const pathname = url.pathname.replace(/\/$/, "");

  return pathname === "" ? "/course" : pathname;
}

function getLessonByPath(pathname: string) {
  const slug = pathname.replace("/course/", "").replaceAll("/", "");
  return courseLessons.find((lesson) => lesson.slug === slug) || null;
}

function getSafeRedirectTo(value: FormDataEntryValue | string | null): string {
  const redirectTo = (value || "").toString().trim();

  if (!redirectTo) return "/course";
  if (!redirectTo.startsWith("/course")) return "/course";
  if (redirectTo.startsWith("//")) return "/course";
  if (redirectTo.includes("://")) return "/course";

  return redirectTo;
}

function renderGatePage(redirectTo = "/course", errorMessage = ""): string {
  const safeRedirectTo = getSafeRedirectTo(redirectTo);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Course Access | Facial Volume Harmony</title>
    <style>
      :root {
        --ink: #111111;
        --muted: #6f6259;
        --paper: #fffdfa;
        --paper-2: #f6f1ea;
        --accent: #6b3f22;
        --line: rgba(17, 17, 17, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(107, 63, 34, 0.12), transparent 34rem),
          var(--paper);
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .card {
        width: min(100%, 520px);
        border: 1px solid var(--line);
        border-radius: 28px;
        background: rgba(255, 253, 250, 0.92);
        box-shadow: 0 24px 70px rgba(17, 17, 17, 0.08);
        padding: 34px;
      }

      .eyebrow {
        margin: 0 0 12px;
        color: var(--accent);
        font-size: 0.78rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 700;
      }

      h1 {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2rem, 5vw, 3.2rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }

      .intro {
        margin: 18px 0 26px;
        color: var(--muted);
        line-height: 1.7;
      }

      label {
        display: block;
        margin-bottom: 8px;
        font-size: 0.92rem;
        font-weight: 700;
      }

      input {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 15px 16px;
        font: inherit;
        background: #fff;
        color: var(--ink);
      }

      input:focus {
        outline: 2px solid rgba(107, 63, 34, 0.24);
        border-color: var(--accent);
      }

      button {
        width: 100%;
        margin-top: 14px;
        border: 0;
        border-radius: 999px;
        padding: 15px 20px;
        font: inherit;
        font-weight: 700;
        color: #fff;
        background: var(--accent);
        cursor: pointer;
      }

      .error {
        margin: 0 0 16px;
        border-radius: 14px;
        padding: 12px 14px;
        color: #7a1f1f;
        background: #fff0f0;
        border: 1px solid rgba(122, 31, 31, 0.18);
        line-height: 1.5;
      }

      .help {
        margin: 18px 0 0;
        color: var(--muted);
        font-size: 0.92rem;
        line-height: 1.6;
      }

      a {
        color: var(--accent);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <p class="eyebrow">Course access</p>
      <h1>Access your program</h1>
      <p class="intro">
        Enter the same email address you used during checkout. If you purchased just now,
        please wait 1–2 minutes and try again.
      </p>

      ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ""}

      <form method="post" action="/course">
        <input type="hidden" name="redirect_to" value="${escapeHtml(safeRedirectTo)}" />

        <label for="email">Purchase email</label>
        <input id="email" name="email" type="email" autocomplete="email" required />
        <button type="submit">Continue to course</button>
      </form>

      <p class="help">
        Need help? Contact us at
        <a href="mailto:hello@facialvolumeharmony.com">hello@facialvolumeharmony.com</a>.
      </p>
    </main>
  </body>
</html>`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const secret = context.env.COURSE_ACCESS_SECRET;
  const pathname = getCoursePath(context.request.url);

  if (!secret) {
    return html("Course access is not configured.", 500);
  }

  const cookieValue = getCookie(context.request, COOKIE_NAME);

  if (!cookieValue) {
    return html(renderGatePage(pathname));
  }

  const emailNormalized = await verifyAccessCookie(cookieValue, secret);

  if (!emailNormalized) {
    return html(renderGatePage(pathname));
  }

  const isPaid = await isPaidCustomer(context.env.DB, emailNormalized);

  if (!isPaid) {
    return html(renderGatePage(pathname, "We could not verify active access for this email."));
  }

  if (pathname === "/course") {
    return html(renderDashboard(emailNormalized, courseLessons));
  }

  const lesson = getLessonByPath(pathname);

  if (!lesson) {
    return html(renderDashboard(emailNormalized, courseLessons), 404);
  }

  return html(
    renderLessonPage({
      lesson,
      lessons: courseLessons,
      emailNormalized,
    })
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const secret = context.env.COURSE_ACCESS_SECRET;

  if (!secret) {
    return html("Course access is not configured.", 500);
  }

  const formData = await context.request.formData();
  const emailOriginal = (formData.get("email") || "").toString();
  const emailNormalized = normalizeEmail(emailOriginal);
  const redirectTo = getSafeRedirectTo(formData.get("redirect_to"));

  if (!isValidEmail(emailNormalized)) {
    return html(renderGatePage(redirectTo, "Please enter a valid email address."), 400);
  }

  const isPaid = await isPaidCustomer(context.env.DB, emailNormalized);

  await logAccessAttempt(context.env.DB, context.request, emailNormalized, isPaid);

  if (!isPaid) {
    return html(
      renderGatePage(
        redirectTo,
        "We could not verify this email. If you purchased just now, please wait 1–2 minutes and try again."
      ),
      403
    );
  }

  const cookieValue = await createAccessCookie(emailNormalized, secret);

  const headers = {
    "set-cookie": `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  };

  return redirect(redirectTo, headers);
};
