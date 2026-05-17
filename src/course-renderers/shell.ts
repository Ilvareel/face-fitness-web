import type { CourseLesson } from "../course-data/course";
import { escapeHtml } from "./utils";

export function renderCourseShell(params: {
  title: string;
  emailNormalized: string;
  lessons: CourseLesson[];
  activeLessonSlug?: string;
  mainContent: string;
}): string {
  const sidebarItems = params.lessons
    .map((lesson) => {
      const isActive = lesson.slug === params.activeLessonSlug;
      const href = `/course/${lesson.slug}`;

      return `<a class="lesson-link ${isActive ? "is-active" : ""}" href="${href}">
        <span class="lesson-index">${lesson.number}</span>
        <span>
          <strong>${escapeHtml(lesson.title)}</strong>
          <small>${escapeHtml(lesson.category)}</small>
        </span>
      </a>`;
    })
    .join("");

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
        --accent: #7b4828;
        --accent-dark: #4f2a15;
        --line: rgba(17, 17, 17, 0.12);
        --soft-shadow: 0 24px 70px rgba(17, 17, 17, 0.08);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at 10% 0%, rgba(123, 72, 40, 0.11), transparent 30rem),
          linear-gradient(180deg, #fffdfa 0%, #f7f1ea 100%);
      }

      a { color: inherit; }

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
        text-decoration: none;
      }

      .brand strong {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 1.35rem;
        letter-spacing: -0.04em;
      }

      .brand small { color: var(--muted); }

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

      .main { min-width: 0; }

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

      .breadcrumb strong { color: var(--ink); }

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

      .hero-card,
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
        max-width: 860px;
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2.3rem, 5.4vw, 4.7rem);
        line-height: 0.95;
        letter-spacing: -0.055em;
      }

      .intro {
        max-width: 760px;
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

      .module-card:hover { background: var(--paper-2); }

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

      .lesson-header { margin-bottom: 22px; }

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

      .media-card { padding: 18px; }

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

      .video-frame {
        position: relative;
        aspect-ratio: 16 / 9;
        border-radius: 22px;
        overflow: hidden;
        background: #000;
      }

        .stream-video-iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #000;
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

      .material-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .fullscreen-button,
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        border-radius: 999px;
        padding: 0 16px;
        border: 1px solid var(--line);
        background: #fff;
        color: var(--ink);
        text-decoration: none;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      .button.primary {
        background: var(--accent-dark);
        color: #fff;
        border-color: var(--accent-dark);
      }

        .html-material-frame {
        position: relative;
        border: 1px solid var(--line);
        border-radius: 22px;
        background: #fff;
        height: min(72vh, 760px);
        min-height: 520px;
        overflow: hidden;
        }

        .html-material-frame:fullscreen {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
        border: 0;
        background: #fff;
        }

        .fullscreen-close {
        display: none;
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 20;
        width: 44px;
        height: 44px;
        border: 1px solid rgba(17, 17, 17, 0.12);
        border-radius: 999px;
        background: rgba(255, 253, 250, 0.92);
        color: var(--ink);
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
        box-shadow: 0 12px 32px rgba(17, 17, 17, 0.12);
        backdrop-filter: blur(12px);
        }

        :fullscreen .fullscreen-close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .html-material-iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #fff;
        }

      .nav-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-top: 24px;
      }

      @media (max-width: 980px) {
        .course-shell { display: block; }
        .sidebar { display: none; }
        .mobile-nav { display: block; }
        .access-pill { white-space: normal; }
      }

      @media (max-width: 680px) {
        .topbar-inner,
        .content-wrap,
        .mobile-nav {
            width: min(100% - 20px, 1180px);
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
        .media-card {
            border-radius: 24px;
        }

        .media-card {
            padding: 12px;
        }

        .material-heading {
            align-items: stretch;
            flex-direction: column;
        }

        .fullscreen-button {
            width: 100%;
        }

        .html-material-frame {
            height: 72vh;
            min-height: 460px;
            border-radius: 18px;
        }

        .html-material-frame:fullscreen {
            height: 100vh;
            border-radius: 0;
        }

        .fullscreen-close {
            top: 14px;
            right: 14px;
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
              ${params.activeLessonSlug ? ` &gt; <strong>${escapeHtml(params.title)}</strong>` : ` &gt; <strong>Dashboard</strong>`}
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