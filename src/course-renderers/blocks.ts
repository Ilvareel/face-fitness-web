import type { LessonBlock } from "../course-data/course";
import { courseMaterials } from "../course-data/materials";
import { escapeHtml } from "./utils";

export function renderLessonBlock(block: LessonBlock): string {
  if (block.type === "video") {
  return `
    <section class="media-card">
      <h2>${escapeHtml(block.title)}</h2>

      <div class="video-frame">
        <iframe
          class="stream-video-iframe"
          title="${escapeHtml(block.title)}"
          src="/api/course-video?videoId=${encodeURIComponent(block.videoId)}"
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowfullscreen
        ></iframe>
      </div>

      ${
        block.duration
          ? `<p class="placeholder-note">Duration: ${escapeHtml(block.duration)}.</p>`
          : ""
      }
    </section>
  `;
}

  if (block.type === "html") {
    return `
      <section class="media-card">
        <div class="material-heading">
          <h2>${escapeHtml(block.title)}</h2>
          <button
            class="fullscreen-button"
            type="button"
            onclick="this.closest('.media-card')?.querySelector('.html-material-frame')?.requestFullscreen?.()"
          >
            Open full screen
          </button>
        </div>

        <div class="html-material-frame" role="region" aria-label="Protected lesson material">
            <button
                class="fullscreen-close"
                type="button"
                aria-label="Close full screen"
                onclick="document.fullscreenElement && document.exitFullscreen?.()"
            >
                ×
            </button>

            <iframe
                class="html-material-iframe"
                title="${escapeHtml(block.title)}"
                src="/api/course-material?id=${encodeURIComponent(block.materialId)}"
                loading="lazy"
                sandbox="allow-same-origin"
                referrerpolicy="no-referrer"
            ></iframe>
        </div>
      </section>
    `;
  }

  return "";
}