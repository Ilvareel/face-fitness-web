import type { D1Database, PagesFunction } from "@cloudflare/workers-types";

type Env = {
  DB: D1Database;
  COURSE_ACCESS_SECRET?: string;
};

type RequestLike = {
  headers: {
    get(name: string): string | null;
  };
};

type Lesson = {
  id: string;
  number: number;
  title: string;
  module: string;
  duration: string;
  hasVideo: boolean;
  hasPdf: boolean;
  description: string;
};

const COOKIE_NAME = "fvh_course_access";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 48; // 48 hours

const LESSONS: Lesson[] = [
  {
    id: "lesson-1",
    number: 1,
    title: "Welcome & Course Overview",
    module: "Start Here",
    duration: "8 min",
    hasVideo: true,
    hasPdf: true,
    description:
      "A calm introduction to the Facial Volume Harmony method, what to expect, and how to use the course safely.",
  },
  {
    id: "lesson-2",
    number: 2,
    title: "Preparation & Safety Principles",
    module: "Foundations",
    duration: "12 min",
    hasVideo: false,
    hasPdf: true,
    description:
      "Important preparation notes, safety guidance, and basic principles before starting the practical lessons.",
  },
  {
    id: "lesson-3",
    number: 3,
    title: "Foundation Practice",
    module: "Foundations",
    duration: "18 min",
    hasVideo: true,
    hasPdf: false,
    description:
      "A guided foundational practice lesson focused on awareness, posture, breath, and controlled facial movement.",
  },
  {
    id: "lesson-4",
    number: 4,
    title: "Volume & Jawline Routine",
    module: "Practice",
    duration: "24 min",
    hasVideo: true,
    hasPdf: true,
    description:
      "A structured practice routine with video guidance and a supporting PDF reference for repeat sessions.",
  },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return email.length > 3 && email.length < 254 && email.includes("@");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function getLessonByPath(pathname: string): Lesson | null {
  const lessonId = pathname.replace("/course/", "").replaceAll("/", "");
  return LESSONS.find((lesson) => lesson.id === lessonId) || null;
}

function getNextLesson(currentLesson: Lesson): Lesson | null {
  return LESSONS.find((lesson) => lesson.number === currentLesson.number + 1) || null;
}

function getPreviousLesson(currentLesson: Lesson): Lesson | null {
  return LESSONS.find((lesson) => lesson.number === currentLesson.number - 1) || null;
}

function renderGatePage(errorMessage = ""): string {
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

      ${errorMessage ? `<p class="error">${errorMessage}</p>` : ""}

      <form method="post" action="/course">
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

function renderCourseShell(params: {
  title: string;
  emailNormalized: string;
  activeLessonId?: string;
  mainContent: string;
  rightPanel?: string;
}): string {
  const sidebarItems = LESSONS.map((lesson) => {
    const isActive = lesson.id === params.activeLessonId;
    const assetLabel = [
      lesson.hasVideo ? "Video" : "",
      lesson.hasPdf ? "PDF" : "",
    ]
      .filter(Boolean)
      .join(" + ");

    return `<a class="lesson-link ${isActive ? "is-active" : ""}" href="/course/${lesson.id}">
      <span class="lesson-index">${lesson.number}</span>
      <span>
        <strong>${escapeHtml(lesson.title)}</strong>
        <small>${escapeHtml(lesson.module)} · ${escapeHtml(assetLabel || "Lesson")}</small>
      </span>
    </a>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(params.title)} | Facial Volume Harmony</title>
    <style>
      :root {
        --ink: #111111;
        --muted: #6f6259;
        --paper: #fffdfa;
        --paper-2: #f7f1ea;
        --paper-3: #efe2d6;
        --accent: #7b4828;
        --accent-dark: #4f2a15;
        --line: rgba(17, 17, 17, 0.12);
        --soft-shadow: 0 24px 70px rgba(17, 17, 17, 0.08);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at 10% 0%, rgba(123, 72, 40, 0.11), transparent 30rem),
          linear-gradient(180deg, #fffdfa 0%, #f7f1ea 100%);
      }

      a {
        color: inherit;
      }

      .course-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
      }

      .sidebar {
        position: sticky;
        top: 0;
        height: 100vh;
        overflow: auto;
        border-right: 1px solid var(--line);
        background: rgba(255, 253, 250, 0.88);
        backdrop-filter: blur(16px);
        padding: 28px 22px;
      }

      .brand {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 28px;
      }

      .brand strong {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 1.35rem;
        letter-spacing: -0.04em;
      }

      .brand small {
        color: var(--muted);
      }

      .progress-card {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: #fff;
        padding: 18px;
        margin-bottom: 24px;
      }

      .progress-card span {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 0.85rem;
      }

      .progress-bar {
        height: 8px;
        border-radius: 999px;
        background: #eadfd6;
        margin-top: 12px;
        overflow: hidden;
      }

      .progress-bar i {
        display: block;
        width: 25%;
        height: 100%;
        background: var(--accent);
      }

      .sidebar-heading {
        margin: 22px 0 10px;
        color: var(--accent);
        font-size: 0.74rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 800;
      }

      .lesson-list {
        display: grid;
        gap: 8px;
      }

      .lesson-link {
        display: grid;
        grid-template-columns: 30px 1fr;
        gap: 10px;
        align-items: start;
        text-decoration: none;
        border: 1px solid transparent;
        border-radius: 16px;
        padding: 11px;
        color: var(--muted);
      }

      .lesson-link:hover,
      .lesson-link.is-active {
        border-color: var(--line);
        background: var(--paper-2);
        color: var(--ink);
      }

      .lesson-index {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: #fff;
        border: 1px solid var(--line);
        color: var(--accent);
        font-weight: 800;
        font-size: 0.82rem;
      }

      .lesson-link strong {
        display: block;
        font-size: 0.92rem;
        line-height: 1.35;
      }

      .lesson-link small {
        display: block;
        margin-top: 3px;
        color: var(--muted);
        font-size: 0.78rem;
      }

      .main {
        min-width: 0;
      }

      .topbar {
        min-height: 76px;
        border-bottom: 1px solid var(--line);
        background: rgba(255, 253, 250, 0.74);
        backdrop-filter: blur(16px);
      }

      .topbar-inner {
        width: min(1180px, calc(100% - 40px));
        min-height: 76px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .breadcrumb {
        color: var(--muted);
        font-size: 0.92rem;
      }

      .breadcrumb strong {
        color: var(--ink);
      }

      .access-pill {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #fff;
        padding: 10px 14px;
        color: var(--muted);
        font-size: 0.84rem;
        white-space: nowrap;
      }

      .mobile-nav {
        display: none;
        width: min(1180px, calc(100% - 40px));
        margin: 18px auto 0;
      }

      .mobile-nav details {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: #fff;
        overflow: hidden;
      }

      .mobile-nav summary {
        cursor: pointer;
        padding: 14px 16px;
        font-weight: 800;
      }

      .mobile-nav .lesson-list {
        padding: 0 10px 12px;
      }

      .content-wrap {
        width: min(1180px, calc(100% - 40px));
        margin: 0 auto;
        padding: 34px 0 72px;
      }

      .two-column {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 290px;
        gap: 24px;
        align-items: start;
      }

      .hero-card,
      .panel,
      .media-card {
        border: 1px solid var(--line);
        border-radius: 30px;
        background: rgba(255, 253, 250, 0.9);
        box-shadow: var(--soft-shadow);
      }

      .hero-card {
        padding: clamp(28px, 5vw, 56px);
        background:
          radial-gradient(circle at top left, rgba(123, 72, 40, 0.12), transparent 34rem),
          rgba(255, 253, 250, 0.92);
      }

      .eyebrow {
        margin: 0 0 12px;
        color: var(--accent);
        font-size: 0.78rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 800;
      }

      h1 {
        max-width: 760px;
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2.3rem, 5.4vw, 4.7rem);
        line-height: 0.95;
        letter-spacing: -0.055em;
      }

      .intro {
        max-width: 720px;
        margin: 20px 0 0;
        color: var(--muted);
        line-height: 1.8;
        font-size: 1.02rem;
      }

      .module-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        margin-top: 22px;
      }

      .module-card {
        display: block;
        text-decoration: none;
        border: 1px solid var(--line);
        border-radius: 24px;
        padding: 22px;
        background: #fff;
      }

      .module-card:hover {
        background: var(--paper-2);
      }

      .module-card small {
        display: block;
        margin-bottom: 10px;
        color: var(--accent);
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .module-card h2 {
        margin: 0 0 10px;
        font-size: 1.1rem;
      }

      .module-card p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .panel {
        padding: 20px;
      }

      .panel h2 {
        margin: 0 0 12px;
        font-size: 1rem;
      }

      .panel p,
      .panel li {
        color: var(--muted);
        line-height: 1.6;
        font-size: 0.92rem;
      }

      .panel ul {
        margin: 0;
        padding-left: 18px;
      }

      .lesson-header {
        margin-bottom: 22px;
      }

      .lesson-header h1 {
        max-width: 920px;
        font-size: clamp(2rem, 4.4vw, 4rem);
      }

      .lesson-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }

      .tag {
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #fff;
        padding: 8px 12px;
        color: var(--muted);
        font-size: 0.84rem;
      }

      .lesson-stack {
        display: grid;
        gap: 22px;
      }

      .media-card {
        padding: 18px;
      }

      .media-card h2 {
        margin: 0 0 12px;
        font-size: 1.05rem;
      }

      .video-placeholder {
        position: relative;
        display: grid;
        place-items: center;
        aspect-ratio: 16 / 9;
        border-radius: 22px;
        overflow: hidden;
        background:
          linear-gradient(135deg, rgba(123, 72, 40, 0.22), rgba(239, 226, 214, 0.88)),
          radial-gradient(circle at 70% 30%, rgba(255,255,255,0.82), transparent 18rem);
      }

      .play-button {
        width: 74px;
        height: 74px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.72);
        background: rgba(79, 42, 21, 0.88);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 1.8rem;
        box-shadow: 0 18px 40px rgba(79, 42, 21, 0.24);
      }

      .placeholder-note {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 0.92rem;
        line-height: 1.6;
      }

      .pdf-placeholder {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: linear-gradient(180deg, #fff 0%, #f7f1ea 100%);
        min-height: 520px;
        padding: 24px;
        display: grid;
        place-items: center;
        text-align: center;
      }

      .pdf-page {
        width: min(100%, 560px);
        min-height: 430px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: #fffdfa;
        padding: 34px;
        box-shadow: 0 20px 50px rgba(17, 17, 17, 0.08);
      }

      .pdf-page strong {
        display: block;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 2rem;
        letter-spacing: -0.04em;
        margin-bottom: 12px;
      }

      .pdf-page p {
        color: var(--muted);
        line-height: 1.7;
      }

      .nav-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 24px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        border-radius: 999px;
        padding: 0 18px;
        text-decoration: none;
        font-weight: 800;
        border: 1px solid var(--line);
        background: #fff;
      }

      .button.primary {
        background: var(--accent-dark);
        color: #fff;
        border-color: var(--accent-dark);
      }

      @media (max-width: 980px) {
        .course-shell {
          display: block;
        }

        .sidebar {
          display: none;
        }

        .mobile-nav {
          display: block;
        }

        .two-column {
          grid-template-columns: 1fr;
        }

        .access-pill {
          white-space: normal;
        }
      }

      @media (max-width: 680px) {
        .topbar-inner,
        .content-wrap,
        .mobile-nav {
          width: min(100% - 28px, 1180px);
        }

        .topbar-inner {
          align-items: flex-start;
          flex-direction: column;
          padding: 16px 0;
        }

        .module-grid {
          grid-template-columns: 1fr;
        }

        .hero-card,
        .media-card,
        .panel {
          border-radius: 24px;
        }

        .pdf-placeholder {
          min-height: 420px;
          padding: 14px;
        }

        .pdf-page {
          min-height: 340px;
          padding: 24px;
        }
      }
    </style>
  </head>
  <body>
    <div class="course-shell">
      <aside class="sidebar">
        <a class="brand" href="/course" aria-label="Course dashboard">
          <strong>Facial Volume Harmony</strong>
          <small>Structured Practice System</small>
        </a>

        <div class="progress-card">
          <span>
            <strong>Course Progress</strong>
            <em>25%</em>
          </span>
          <div class="progress-bar" aria-hidden="true"><i></i></div>
        </div>

        <p class="sidebar-heading">Lessons</p>
        <nav class="lesson-list" aria-label="Course lessons">
          ${sidebarItems}
        </nav>
      </aside>

      <section class="main">
        <header class="topbar">
          <div class="topbar-inner">
            <div class="breadcrumb">
              <a href="/course">Facial Volume Harmony</a>
              ${params.activeLessonId ? ` &gt; <strong>${escapeHtml(params.title)}</strong>` : ` &gt; <strong>Dashboard</strong>`}
            </div>
            <div class="access-pill">Access verified for ${escapeHtml(params.emailNormalized)}</div>
          </div>
        </header>

        <div class="mobile-nav">
          <details>
            <summary>Course lessons</summary>
            <nav class="lesson-list" aria-label="Mobile course lessons">
              ${sidebarItems}
            </nav>
          </details>
        </div>

        <main class="content-wrap">
          ${params.mainContent}
        </main>
      </section>
    </div>
  </body>
</html>`;
}

function renderDashboard(emailNormalized: string): string {
  const firstLesson = LESSONS[0];

  const moduleCards = LESSONS.map((lesson) => {
    return `<a class="module-card" href="/course/${lesson.id}">
      <small>Lesson ${lesson.number} · ${escapeHtml(lesson.module)}</small>
      <h2>${escapeHtml(lesson.title)}</h2>
      <p>${escapeHtml(lesson.description)}</p>
    </a>`;
  }).join("");

  const mainContent = `
    <div class="two-column">
      <section>
        <div class="hero-card">
          <p class="eyebrow">Protected course</p>
          <h1>Welcome to your course portal.</h1>
          <p class="intro">
            Continue step by step through the Facial Volume Harmony practice system.
            Your lessons will include video guidance, protected PDF materials, or both,
            depending on the lesson.
          </p>
          <div class="nav-row">
            <a class="button primary" href="/course/${firstLesson.id}">Start Lesson 1</a>
          </div>
        </div>

        <section class="module-grid" aria-label="Course lessons">
          ${moduleCards}
        </section>
      </section>

      <aside class="panel">
        <h2>Your access</h2>
        <p>
          You are currently verified as:<br />
          <strong>${escapeHtml(emailNormalized)}</strong>
        </p>
        <p>
          Access stays active for 48 hours on this device. After that, you will simply
          verify your purchase email again.
        </p>
      </aside>
    </div>
  `;

  return renderCourseShell({
    title: "Course Dashboard",
    emailNormalized,
    mainContent,
  });
}

function renderLessonPage(lesson: Lesson, emailNormalized: string): string {
  const previousLesson = getPreviousLesson(lesson);
  const nextLesson = getNextLesson(lesson);

  const videoBlock = lesson.hasVideo
    ? `<section class="media-card">
        <h2>Video lesson</h2>
        <div class="video-placeholder" role="img" aria-label="Protected video placeholder">
          <div class="play-button">▶</div>
        </div>
        <p class="placeholder-note">
          Video placeholder. In Phase 5B this area will use Cloudflare Stream with protected playback.
        </p>
      </section>`
    : "";

  const pdfBlock = lesson.hasPdf
    ? `<section class="media-card">
        <h2>PDF material</h2>
        <div class="pdf-placeholder" role="img" aria-label="Protected PDF viewer placeholder">
          <div class="pdf-page">
            <strong>${escapeHtml(lesson.title)}</strong>
            <p>
              Protected PDF viewer placeholder. In Phase 5B this will load the PDF through
              a protected endpoint, without a public file URL and without a visible download button.
            </p>
            <p>
              Later we can add email watermarking for stronger sharing deterrence.
            </p>
          </div>
        </div>
      </section>`
    : "";

  const mainContent = `
    <div class="two-column">
      <section class="lesson-stack">
        <div class="lesson-header">
          <p class="eyebrow">${escapeHtml(lesson.module)}</p>
          <h1>${lesson.number}. ${escapeHtml(lesson.title)}</h1>
          <p class="intro">${escapeHtml(lesson.description)}</p>

          <div class="lesson-meta">
            <span class="tag">${escapeHtml(lesson.duration)}</span>
            ${lesson.hasVideo ? `<span class="tag">Video lesson</span>` : ""}
            ${lesson.hasPdf ? `<span class="tag">Protected PDF</span>` : ""}
          </div>
        </div>

        ${videoBlock}
        ${pdfBlock}

        <section class="media-card">
          <h2>Lesson notes</h2>
          <p class="placeholder-note">
            Placeholder for additional lesson notes, practice reminders, warnings,
            or written instructions. We can remove this later if you decide it is not needed.
          </p>
        </section>

        <div class="nav-row">
          ${previousLesson ? `<a class="button" href="/course/${previousLesson.id}">← Previous</a>` : `<a class="button" href="/course">← Dashboard</a>`}
          ${nextLesson ? `<a class="button primary" href="/course/${nextLesson.id}">Next lesson →</a>` : `<a class="button primary" href="/course">Back to dashboard</a>`}
        </div>
      </section>

      <aside class="panel">
        <h2>Lesson access</h2>
        <p>
          Signed in as:<br />
          <strong>${escapeHtml(emailNormalized)}</strong>
        </p>
        <ul>
          <li>Course pages are noindex.</li>
          <li>Materials are visible only after verification.</li>
          <li>Your access cookie is valid for 48 hours.</li>
        </ul>
      </aside>
    </div>
  `;

  return renderCourseShell({
    title: lesson.title,
    emailNormalized,
    activeLessonId: lesson.id,
    mainContent,
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const secret = context.env.COURSE_ACCESS_SECRET;

  if (!secret) {
    return html("Course access is not configured.", 500);
  }

  const cookieValue = getCookie(context.request, COOKIE_NAME);

  if (!cookieValue) {
    return html(renderGatePage());
  }

  const emailNormalized = await verifyAccessCookie(cookieValue, secret);

  if (!emailNormalized) {
    return html(renderGatePage());
  }

  const isPaid = await isPaidCustomer(context.env.DB, emailNormalized);

  if (!isPaid) {
    return html(renderGatePage("We could not verify active access for this email."));
  }

  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/$/, "");

  if (pathname === "/course") {
    return html(renderDashboard(emailNormalized));
  }

  const lesson = getLessonByPath(pathname);

  if (!lesson) {
    return html(renderDashboard(emailNormalized), 404);
  }

  return html(renderLessonPage(lesson, emailNormalized));
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const secret = context.env.COURSE_ACCESS_SECRET;

  if (!secret) {
    return html("Course access is not configured.", 500);
  }

  const formData = await context.request.formData();
  const emailOriginal = (formData.get("email") || "").toString();
  const emailNormalized = normalizeEmail(emailOriginal);

  if (!isValidEmail(emailNormalized)) {
    return html(renderGatePage("Please enter a valid email address."), 400);
  }

  const isPaid = await isPaidCustomer(context.env.DB, emailNormalized);

  await logAccessAttempt(context.env.DB, context.request, emailNormalized, isPaid);

  if (!isPaid) {
    return html(
      renderGatePage(
        "We could not verify this email. If you purchased just now, please wait 1–2 minutes and try again."
      ),
      403
    );
  }

  const cookieValue = await createAccessCookie(emailNormalized, secret);

  const headers = {
    "set-cookie": `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/course; HttpOnly; Secure; SameSite=Lax`,
  };

  return redirect("/course", headers);
};