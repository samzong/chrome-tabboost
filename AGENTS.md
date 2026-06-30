## Scope

Project-local instructions for TabBoost, a Manifest V3 Chrome extension. Follow the shared global agent rules first, then these repository-specific rules.

## Project Shape

- Package manager: npm. This repo has `package-lock.json`; use `npm ci`, `npm test`, `npm run build`, and `npm run validate`.
- Runtime: Chrome Extension Manifest V3.
- Main surfaces:
  - `src/js/background.js`: service worker, Chrome APIs, commands, DNR ruleset toggling, extension messages.
  - `src/js/contentScript.js`: page-injected behavior, link preview popup, save shortcut interception.
  - `src/js/splitView/`: split view implementation.
  - `src/popup/` and `src/options/`: extension UI.
  - `rules/`: static Declarative Net Request rules.
- Build output: `build/`. Load this directory as the unpacked extension for local verification.

## Chrome Extension Debugging

Do not start with a patch. Convert every browser symptom into a layer-specific failure first.

For link preview, separate these layers:

1. Source page policy: the page hosting TabBoost may block child frames through its own `Content-Security-Policy`, especially `frame-src`.
2. Redirect layer: short links such as `https://t.co/...` may redirect before the final target is reached.
3. Target page policy: the final target may block embedding through `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`.
4. Extension runtime: DNR rulesets, storage settings, service worker logs, content script logs, and iframe load detection may disagree.

Required evidence before fixing iframe/link-preview bugs:

- Source page URL.
- Clicked link selector, visible text, or exact `href`.
- Whether the issue is Chrome Web Store build or local `build/`.
- Extension service worker output for:
  - `await chrome.storage.sync.get({ headerModificationEnabled: true })`
  - `await chrome.declarativeNetRequest.getEnabledRulesets()`
- Source page DevTools Console errors, especially `Refused to frame` or CSP violations.
- Source page Network evidence:
  - main document response headers;
  - whether the main document is `from service worker`;
  - iframe/redirect requests, if any;
  - final target response headers.

If Network shows the main document is `from service worker`, verify the same repro with DevTools `Application -> Service Workers -> Bypass for network`. This distinguishes a site service-worker path from an extension DNR/header-modification path.

For this class of bug, "Page loaded" in the popup is not proof of success. An iframe `load` event may still display a Chrome blocked page. Treat user-visible blocked content, Console CSP errors, and Network request absence as stronger evidence than the popup title.

Use Chrome CDP or DevTools for browser verification. Do not scaffold Playwright/Puppeteer for ad-hoc extension debugging unless this repo already owns that test path.

## Verification

For code changes, run the narrowest meaningful check first, then the repo gate:

- Unit-level change: `npm test -- <matching test file or pattern>`.
- Extension behavior change: `npm run build`, load `build/` as unpacked extension, and re-check the exact browser symptom.
- Release-readiness change: `npm run validate`.

Do not claim a Chrome extension behavior is fixed without a fresh browser repro or an explicit statement that browser verification was not possible.
