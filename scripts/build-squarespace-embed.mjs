import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const outputDir = process.env.PACBECCA_SQUARESPACE_OUTPUT_DIR
  ? resolve(process.env.PACBECCA_SQUARESPACE_OUTPUT_DIR)
  : resolve(repoRoot, "output");
const optimizedAssetDir = join(outputDir, "pacbecca-optimized-assets");
const distDir = join(repoRoot, "dist-squarespace");
const leaderboardApiUrl = "https://pacbecca-leaderboard.danwalkerworks.workers.dev/api/leaderboard";
const publicPageName = "PacBecca";
const publicPageSlug = "/pacbecca";
const codeBlockFileName = "pacbecca-page-code-block.html";
const alternateCodeBlockFileName = "pacbecca-code-block.html";
const setupGuideFileName = "pacbecca-squarespace-setup.md";

function dataUrl(file, mimeType) {
  return `data:${mimeType};base64,${readFileSync(file).toString("base64")}`;
}

function jsString(value) {
  return JSON.stringify(value);
}

function escapeInlineScript(script) {
  return script.replace(/<\/script/gi, "<\\/script");
}

function readBuiltAppHtml() {
  let html = readFileSync(join(distDir, "index.html"), "utf8");
  const cssHref = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/)?.[1];
  const jsSrc = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1];

  if (!cssHref || !jsSrc) {
    throw new Error("Could not find Vite CSS/JS references in dist-squarespace/index.html");
  }

  const css = readFileSync(join(distDir, cssHref.replace(/^\//, "")), "utf8");
  let js = readFileSync(join(distDir, jsSrc.replace(/^\//, "")), "utf8");

  const replacements = new Map([
    ["/assets/becca-head.png", dataUrl(join(optimizedAssetDir, "becca-head.webp"), "image/webp")],
    [
      "/assets/becca-head-sheet.png",
      dataUrl(join(optimizedAssetDir, "becca-head-sheet.webp"), "image/webp")
    ],
    [
      "/assets/rage/brazy-becca-rage-1.jpg",
      dataUrl(join(optimizedAssetDir, "rage", "brazy-becca-rage-1.jpg"), "image/jpeg")
    ],
    [
      "/assets/rage/brazy-becca-rage-2.jpg",
      dataUrl(join(optimizedAssetDir, "rage", "brazy-becca-rage-2.jpg"), "image/jpeg")
    ],
    [
      "/assets/rage/brazy-becca-rage-3.jpg",
      dataUrl(join(optimizedAssetDir, "rage", "brazy-becca-rage-3.jpg"), "image/jpeg")
    ],
    [
      "/assets/rage/brazy-becca-rage-4.jpg",
      dataUrl(join(optimizedAssetDir, "rage", "brazy-becca-rage-4.jpg"), "image/jpeg")
    ],
    [
      "/assets/rage/brazy-becca-rage-5.jpg",
      dataUrl(join(optimizedAssetDir, "rage", "brazy-becca-rage-5.jpg"), "image/jpeg")
    ]
  ]);

  for (const [path, url] of replacements) {
    js = js.split(jsString(path)).join(jsString(url));
  }

  js = escapeInlineScript(js);

  html = html
    .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, () => `<style>${css}</style>`)
    .replace(
      /<script type="module" crossorigin src="[^"]+"><\/script>/,
      () =>
        `<script>window.PACBECCA_LEADERBOARD_API_URL = ${jsString(leaderboardApiUrl)};</script>\n    <script type="module">${js}</script>`
    );

  return html;
}

function buildCodeBlock(appHtml) {
  const encoded = Buffer.from(appHtml, "utf8").toString("base64");

  return `<section class="dw-pacbecca-game" aria-label="PacBecca game">
  <iframe id="dw-pacbecca-frame" class="dw-pacbecca-frame" title="PacBecca game" loading="eager" allow="fullscreen"></iframe>
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
  const encoded = '${encoded}';
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  frame.srcdoc = new TextDecoder().decode(bytes);
})();
<\/script>
`;
}

function buildSetupGuide() {
  return `# ${publicPageName} Squarespace Setup

1. Open the existing Squarespace page that currently hosts the password page for PacBecca.
2. In Page Settings, turn off page password protection and clear any saved password.
3. Rename the page to \`${publicPageName}\`.
4. Set the page URL slug to \`${publicPageSlug}\`.
5. Add or replace the page Code block with \`output/${codeBlockFileName}\`.
6. Replace the Games & Stuff page Code block with \`output/games-stuff-code-block-simple.html\`.

The Games & Stuff link should point directly to \`${publicPageSlug}\`. PacBecca is now configured as a public Squarespace page, so the old \`/brazybatellion-exclusive\` password page can be unpublished or removed after the public page works.
`;
}

const appHtml = readBuiltAppHtml();
const codeBlock = buildCodeBlock(appHtml);
const setupGuide = buildSetupGuide();

mkdirSync(outputDir, { recursive: true });

writeFileSync(join(outputDir, codeBlockFileName), codeBlock, "utf8");
writeFileSync(join(outputDir, alternateCodeBlockFileName), codeBlock, "utf8");
writeFileSync(join(outputDir, "brazybatellion-exclusive-page-code-block.html"), codeBlock, "utf8");
writeFileSync(join(outputDir, "brazybatellion-exclusive-pacbecca-code-block.html"), codeBlock, "utf8");
writeFileSync(join(outputDir, setupGuideFileName), setupGuide, "utf8");
writeFileSync(join(outputDir, "brazybatellion-exclusive-squarespace-setup.md"), setupGuide, "utf8");
writeFileSync(
  join(outputDir, "pacbecca-embed-test.html"),
  `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>PacBecca Squarespace Embed Test</title>\n</head>\n<body>\n${codeBlock}\n</body>\n</html>\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      codeBlockBytes: Buffer.byteLength(codeBlock, "utf8"),
      iframeHtmlBytes: Buffer.byteLength(appHtml, "utf8"),
      output: join(outputDir, codeBlockFileName),
      setup: join(outputDir, setupGuideFileName),
      slug: publicPageSlug
    },
    null,
    2
  )
);
