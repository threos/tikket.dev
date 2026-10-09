// Rasterises the favicon / touch icon / email logo PNGs from the SVG sources
// written by generate.py. Run from the repository root after generate.py.
const fs = require("fs");
const path = require("path");

function loadChromium() {
  for (const mod of ["playwright", "@playwright/test", process.env.PLAYWRIGHT_MODULE]) {
    if (!mod) continue;
    try {
      return require(mod).chromium;
    } catch (_err) {
      // try the next candidate
    }
  }
  throw new Error("Playwright not found; set PLAYWRIGHT_MODULE to a resolvable playwright package path");
}

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(__dirname, "raster-src");
const WEB = path.join(ROOT, "apps", "web", "public");

const jobs = [
  // [source svg, output png, width, height]
  ["tile.svg", path.join(SRC, "favicon-16.png"), 16, 16],
  ["tile.svg", path.join(SRC, "favicon-32.png"), 32, 32],
  ["tile.svg", path.join(SRC, "favicon-48.png"), 48, 48],
  ["tile.svg", path.join(WEB, "favicon-16x16.png"), 16, 16],
  ["tile.svg", path.join(WEB, "favicon-32x32.png"), 32, 32],
  ["tile.svg", path.join(WEB, "apple-touch-icon.png"), 180, 180],
  ["tile.svg", path.join(WEB, "android-chrome-192x192.png"), 192, 192],
  ["tile.svg", path.join(WEB, "android-chrome-256x256.png"), 256, 256],
  ["tile.svg", path.join(WEB, "android-chrome-384x384.png"), 384, 384],
  ["tile.svg", path.join(WEB, "android-chrome-512x512.png"), 512, 512],
  ["mstile-square.svg", path.join(WEB, "mstile-70x70.png"), 128, 128],
  ["mstile-square.svg", path.join(WEB, "mstile-144x144.png"), 144, 144],
  ["mstile-square.svg", path.join(WEB, "mstile-150x150.png"), 150, 150],
  ["mstile-square.svg", path.join(WEB, "mstile-310x310.png"), 558, 558],
  ["mstile-wide.svg", path.join(WEB, "mstile-310x150.png"), 558, 270],
  ["email-logo.svg", path.join(WEB, "emails", "logo.png"), 141, 38],
  ["email-hero.svg", path.join(WEB, "emails", "calendar-email-hero.png"), 1120, 524],
  ["og-image.svg", path.join(WEB, "og-image.png"), 1200, 630],
  ["video-og-image.svg", path.join(WEB, "video-og-image.png"), 1200, 630],
];

(async () => {
  const chromium = loadChromium();
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [src, out, w, h] of jobs) {
    const svg = fs.readFileSync(path.join(SRC, src), "utf8");
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg.replace(/width="[^"]+" height="[^"]+"/, `width="${w}" height="${h}"`)}</body></html>`
    );
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log("wrote", path.relative(ROOT, out));
  }
  await browser.close();
})();
