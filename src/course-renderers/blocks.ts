import type { LessonBlock } from "../course-data/course";
import { courseMaterials } from "../course-data/materials";
import { escapeHtml } from "./utils";

export function renderLessonBlock(block: LessonBlock): string {
  if (block.type === "video") {
    return `
      <section class="media-card">
        <h2>${escapeHtml(block.title)}</h2>
        <div class="video-placeholder" role="img" aria-label="Protected video placeholder">
          <div class="play-button">▶</div>
        </div>
        <p class="placeholder-note">
          Video placeholder. Later this will use Cloudflare Stream protected playback.
          ${block.duration ? `Duration: ${escapeHtml(block.duration)}.` : ""}
        </p>
      </section>
    `;
  }

  if (block.type === "html") {
    const material = courseMaterials[block.materialId];

    if (!material) {
      return `
        <section class="media-card">
          <h2>${escapeHtml(block.title)}</h2>
          <p class="placeholder-note">
            Material not found: <code>${escapeHtml(block.materialId)}</code>
          </p>
        </section>
      `;
    }

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
          <iframe
            class="html-material-iframe"
            title="${escapeHtml(block.title)}"
            srcdoc="${escapeHtml(material)}"
            loading="lazy"
            sandbox=""
            referrerpolicy="no-referrer"
          ></iframe>
        </div>
      </section>
    `;
  }

  return "";
}