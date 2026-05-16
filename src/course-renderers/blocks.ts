import type { LessonBlock } from "../course-data/course";
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
    return `
      <section class="media-card">
        <div class="material-heading">
          <h2>${escapeHtml(block.title)}</h2>
          <button class="fullscreen-button" type="button">Open full screen</button>
        </div>

        <div class="html-material-frame" role="region" aria-label="Protected lesson material">
          <div class="html-material-placeholder">
            <strong>${escapeHtml(block.title)}</strong>
            <p>
              Protected HTML material placeholder. Later this will load material ID:
              <code>${escapeHtml(block.materialId)}</code>
            </p>
          </div>
        </div>
      </section>
    `;
  }

  return "";
}