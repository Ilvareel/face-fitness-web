import type { CourseLesson } from "../course-data/course";
import { renderLessonBlock } from "./blocks";
import { renderCourseShell } from "./shell";
import { escapeHtml } from "./utils";

function getNextLesson(lessons: CourseLesson[], currentLesson: CourseLesson): CourseLesson | null {
  return lessons.find((lesson) => lesson.number === currentLesson.number + 1) || null;
}

function getPreviousLesson(
  lessons: CourseLesson[],
  currentLesson: CourseLesson
): CourseLesson | null {
  return lessons.find((lesson) => lesson.number === currentLesson.number - 1) || null;
}

function getLessonTags(lesson: CourseLesson): string {
  const hasVideo = lesson.blocks.some((block) => block.type === "video");
  const hasHtml = lesson.blocks.some((block) => block.type === "html");

  return `
    ${hasVideo ? `<span class="tag">Video lesson</span>` : ""}
    ${hasHtml ? `<span class="tag">HTML material</span>` : ""}
  `;
}

export function renderLessonPage(params: {
  lesson: CourseLesson;
  lessons: CourseLesson[];
  emailNormalized: string;
}): string {
  const previousLesson = getPreviousLesson(params.lessons, params.lesson);
  const nextLesson = getNextLesson(params.lessons, params.lesson);

  const blocks = params.lesson.blocks.map((block) => renderLessonBlock(block)).join("");

  const mainContent = `
    <section class="lesson-stack">
      <div class="lesson-header">
        <p class="eyebrow">${escapeHtml(params.lesson.category)}</p>
        <h1>${params.lesson.number}. ${escapeHtml(params.lesson.title)}</h1>
        <p class="intro">${escapeHtml(params.lesson.description)}</p>

        <div class="lesson-meta">
          ${getLessonTags(params.lesson)}
        </div>
      </div>

      ${blocks}

      <div class="nav-row">
        ${
          previousLesson
            ? `<a class="button" href="/course/${previousLesson.slug}">← Previous</a>`
            : `<a class="button" href="/course">← Dashboard</a>`
        }
        ${
          nextLesson
            ? `<a class="button primary" href="/course/${nextLesson.slug}">Next lesson →</a>`
            : `<a class="button primary" href="/course">Back to dashboard</a>`
        }
      </div>
    </section>
  `;

  return renderCourseShell({
    title: params.lesson.title,
    emailNormalized: params.emailNormalized,
    lessons: params.lessons,
    activeLessonSlug: params.lesson.slug,
    mainContent,
  });
}