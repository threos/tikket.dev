# Tikket brand assets

Everything here is generated from one geometric construction in `generate.py`; edit the parameters there rather than the SVGs.

## The mark

- Three 30° pie slices meet at the centre, pointing up-right, up-left and down.
- Three right-angled triangles point inward from the top, lower-left and lower-right. Their sides are parallel to the neighbouring slice edges, so every gap between pieces is the same width (0.26 R).
- Every outer edge is trimmed by one shared circle of radius R.
- The mark is 3-fold rotationally symmetric. `variants/01-mark.svg` draws one slice and one triangle and rotates the pair by 120° and 240°.

## The lockup

Mark first, then the "tikket" wordmark. The mark's diameter equals the ascender height of the wordmark (top of the "k" to the baseline) and its bottom sits on the text baseline. The gap between mark and text is 3.5 units in the 26-unit text frame.

| File | Use |
|------|-----|
| `tikket-mark.svg` / `tikket-mark-white.svg` | Standalone mark |
| `tikket-lockup.svg` / `tikket-lockup-white.svg` | Mark + wordmark, light / dark backgrounds |
| `variants/` | Twelve explorations (rounded, outline, badge, app tile, colour, compact, ring, six slices) |
| `raster-src/` | SVG sources used to rasterise favicons, touch icons, Windows tiles and the email logo |

## Where the assets live in the app

File names in `apps/web/public` and `apps/docs/public` are kept from the Cal.diy fork so existing references (`packages/lib/constants.ts`, `/api/logo`, email templates) keep working:

- `cal-com-icon.svg`, `cal-com-icon-white.svg`: mark (dark ink, transparent), inverted via CSS in dark mode
- `safari-pinned-tab.svg`: mark in pure black for the Safari mask icon
- `calcom-logo-white-word.svg`, `cal-logo-word.svg`, `cal-logo-word-black.svg`, `cal-logo-word-dark.svg`, `calcom-white.svg`: lockups in the ink colour each name implies
- `favicon*.png`, `favicon.ico`, `apple-touch-icon.png`, `android-chrome-*.png`: white mark on a dark rounded tile
- `mstile-*.png`: white mark on transparent, shown on the `TileColor` from `browserconfig.xml`
- `emails/logo.png`: lockup at 2x for the 70×19 email header
- `apps/docs/public/cal-docs-logo*.svg`: lockup followed by "Docs"

## Regenerating

```bash
python3 docs/brand/generate.py        # all SVGs (brand folder + app public folders)
node docs/brand/render-icons.js       # PNGs via Playwright's Chromium
python3 docs/brand/generate.py --ico  # favicon.ico from the 16/32/48 px renders
```
