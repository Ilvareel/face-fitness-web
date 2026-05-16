import type { CourseLesson } from "../course-data/course";
import { renderCourseShell } from "./shell";
import { escapeHtml } from "./utils";

export function renderDashboard(emailNormalized: string, lessons: CourseLesson[]): string {
  const firstLesson = lessons[0];

  const moduleCards = lessons
    .map((lesson) => {
      return `<a class="module-card" href="/course/${lesson.slug}">
        <small>Lesson ${lesson.number} · ${escapeHtml(lesson.category)}</small>
        <h2>${escapeHtml(lesson.title)}</h2>
        <p>${escapeHtml(lesson.description)}</p>
      </a>`;
    })
    .join("");

  const mainContent = `
    <section>
      <div class="hero-card">
        <p class="eyebrow">Protected course</p>
        <h1>Welcome to your course portal.</h1>
        <p class="intro">
          Continue step by step through the Facial Volume Harmony practice system.
          Your lessons may include video guidance, protected HTML materials, or both.
        </p>
        ${
          firstLesson
            ? `<div class="nav-row">
                <a class="button primary" href="/course/${firstLesson.slug}">Start Lesson 1</a>
              </div>`
            : ""
        }
      </div>

      <section class="module-grid" aria-label="Course lessons">
        ${moduleCards}
      </section>
    </section>
  `;

  return renderCourseShell({
    title: "Course Dashboard",
    emailNormalized,
    lessons,
    mainContent,
  });
}