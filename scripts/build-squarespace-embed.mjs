import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const outputDir = process.env.PACBECCA_SQUARESPACE_OUTPUT_DIR
  ? resolve(process.env.PACBECCA_SQUARESPACE_OUTPUT_DIR)
  : resolve(repoRoot, "output");
const githubPagesUrl =
  process.env.PACBECCA_GITHUB_PAGES_URL ?? "https://shad0w746.github.io/PacBecca/";
const publicPageName = "PacBecca";
const publicPageSlug = "/pacbecca";
const codeBlockFileName = "pacbecca-page-code-block.html";
const alternateCodeBlockFileName = "pacbecca-code-block.html";
const setupGuideFileName = "pacbecca-squarespace-setup.md";

function htmlAttribute(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildCodeBlock() {
  return `<section class="dw-pacbecca-game" aria-label="PacBecca game">
  <iframe id="dw-pacbecca-frame" class="dw-pacbecca-frame" title="PacBecca game" src="${htmlAttribute(githubPagesUrl)}" loading="eager" allow="fullscreen"></iframe>
</section>
<style>
.dw-pacbecca-game { --dw-pacbecca-header-offset: 0px; position: relative; width: 100%; min-height: calc(100svh - var(--dw-pacbecca-header-offset)); margin: 0; overflow: hidden; background: #101018; color: #f8fafc; padding-top: var(--dw-pacbecca-header-offset); }
.dw-pacbecca-frame { display: block; width: 100%; height: calc(100svh - var(--dw-pacbecca-header-offset)); min-height: 640px; border: 0; background: #101018; }
footer, [role="contentinfo"], .Footer, .site-footer, .footer, #footer, [data-section-id][data-section-theme] footer { display: none !important; }
@media (max-width: 980px) { .dw-pacbecca-frame { min-height: 560px; } }
</style>
<script>
(() => {
  const root = document.querySelector('.dw-pacbecca-game');
  const frame = document.getElementById('dw-pacbecca-frame');
  if (!root || !frame) return;

  const headerSelectors = ['header', '[role="banner"]', '.Header', '.header', '.site-header', '.SiteHeader', '[data-header-style]'];

  const toPixels = (value) => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed)) return 0;
    return value.trim().endsWith('vw') ? window.innerWidth * parsed / 100 : parsed;
  };

  const headerOverlap = () => {
    const rootTop = root.getBoundingClientRect().top;
    let overlap = 0;
    for (const selector of headerSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (!(element instanceof HTMLElement) || element.contains(root)) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= rootTop || rect.top > 160) continue;
        overlap = Math.max(overlap, rect.bottom - rootTop);
      }
    }
    return Math.max(0, Math.min(Math.ceil(overlap), Math.floor(window.innerHeight * 0.35)));
  };

  const fitFrame = () => {
    const parentRect = root.parentElement ? root.parentElement.getBoundingClientRect() : null;
    const gutter = toPixels(getComputedStyle(root).getPropertyValue('--sqs-site-gutter') || '0');
    const targetLeft = parentRect ? Math.max(0, parentRect.left - gutter) : 0;
    const targetWidth = Math.max(320, window.innerWidth - targetLeft);
    if (parentRect) root.style.marginLeft = Math.round(targetLeft - parentRect.left) + 'px';
    root.style.width = Math.round(targetWidth) + 'px';

    const offset = headerOverlap();
    root.style.setProperty('--dw-pacbecca-header-offset', offset + 'px');

    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const frameTop = frame.getBoundingClientRect().top;
    const minHeight = window.innerWidth <= 980 ? 560 : 640;
    const usableHeight = Math.max(minHeight, Math.floor(viewportHeight - frameTop));
    frame.style.height = usableHeight + 'px';
  };

  window.addEventListener('resize', fitFrame, { passive: true });
  window.addEventListener('scroll', fitFrame, { passive: true });
  window.addEventListener('orientationchange', fitFrame, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitFrame, { passive: true });
  window.addEventListener('message', (event) => {
    if (event.source === frame.contentWindow && event.data?.type === 'pacbecca:resize') fitFrame();
  });
  frame.addEventListener('load', () => {
    fitFrame();
    setTimeout(fitFrame, 250);
  });
  fitFrame();
})();
<\/script>
`;
}

function buildSetupGuide() {
  return `# ${publicPageName} Squarespace Setup

1. Delete or unpublish the old restricted PacBecca page.
2. Create or keep a public page named \`${publicPageName}\`.
3. Set the page URL slug to \`${publicPageSlug}\`.
4. Confirm page access is public.
5. Add or replace the page Code block with \`output/${codeBlockFileName}\`.
6. Replace the Games & Stuff page Code block with \`output/games-stuff-code-block-simple.html\`.

The public Squarespace page embeds the GitHub Pages build at ${githubPagesUrl}. The Games & Stuff link should point directly to \`${publicPageSlug}\`. The old restricted page should not remain published or linked.
`;
}

const codeBlock = buildCodeBlock();
const setupGuide = buildSetupGuide();

mkdirSync(outputDir, { recursive: true });

writeFileSync(join(outputDir, codeBlockFileName), codeBlock, "utf8");
writeFileSync(join(outputDir, alternateCodeBlockFileName), codeBlock, "utf8");
writeFileSync(join(outputDir, setupGuideFileName), setupGuide, "utf8");
writeFileSync(
  join(outputDir, "pacbecca-embed-test.html"),
  `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>PacBecca Squarespace Embed Test</title>\n</head>\n<body>\n${codeBlock}\n</body>\n</html>\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      codeBlockBytes: Buffer.byteLength(codeBlock, "utf8"),
      githubPagesUrl,
      output: join(outputDir, codeBlockFileName),
      setup: join(outputDir, setupGuideFileName),
      slug: publicPageSlug
    },
    null,
    2
  )
);
