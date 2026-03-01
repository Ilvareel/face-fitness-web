// @ts-check
import { defineConfig } from 'astro/config';

// Week 5 – SEO foundation:
// Using explicit fallback to avoid TypeScript "process" warning in VS Code.
const site =
  (typeof process !== 'undefined' && process.env.PUBLIC_SITE_URL)
    ? process.env.PUBLIC_SITE_URL
    : 'http://localhost:4321';

export default defineConfig({
  site,
});