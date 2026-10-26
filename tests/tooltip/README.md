# Tooltip regression and browser checks

`pnpm run test:tooltip` runs deterministic regression tests without WebGL. The main `pnpm run check` includes these tests and the public API type checks.

For real rendering checks, start `pnpm run dev` and open `/tests/tooltip/browser.html`. The left column uses Canvas labels; the right column uses native Mapbox Markers with the existing CSS. Compare typography, dimensions, backgrounds, corners and shadows.

Use `/tests/tooltip/browser.html?connectors` for all nine anchors, or append `&dense` for connector/label/icon collision checks. `CMAP_CONNECTOR_SCREENSHOT_PATH` optionally saves the connector comparison screenshot during the browser check.

`pnpm run test:tooltip:browser` requires a local Playwright installation and a browser. Optional environment variables:

- `CMAP_PLAYWRIGHT_PATH`: path to an existing Playwright package.
- `CMAP_CHROME_PATH`: executable path of an existing Chrome installation.
- `CMAP_TEST_BASE_URL`: running demo server, defaults to `http://127.0.0.1:5173`.
- `CMAP_SCREENSHOT_PATH`: optional absolute path for the comparison screenshot.

The browser check verifies dimensions against the original HTML labels, checks legacy DOM clicks, hide/show and resize behavior, renders 300 / 1,000 / 5,000 labels with collision avoidance disabled in both modes, reports construction and frame timings, and checks pitch/bearing updates and cleanup. Local headless-browser timings are comparative diagnostics, not device-independent capacity or FPS guarantees. This optional check is separate from CI because it needs a browser and a running preview.
