# Website Blocklist Design (Issue #67)

## Context
Users need a way to disable TabBoost content-script features on specific sites (e.g., DevTools, browser terminals) where global listeners conflict with critical workflows. Goal: configurable site blocklist without disabling the entire extension.

## Goals
- **Site-scoped opt-out**: Disable all content-script features (link preview, split-view, save intercept, notifications) on selected domains.
- **Early evaluation**: Check blocklist before DOM listeners attach.
- **Management UI**: Advanced Settings tab in options page for add/remove entries.
- **Quick disable**: Popup button to add current site to blocklist.
- **Sync storage**: Persist via `chrome.storage.sync` with quota limits and deduplication.

## Non-goals
- Per-feature toggles (MVP: all-or-nothing per site).
- `chrome.commands` shortcuts remain global (not affected).
- Dynamic permission or `declarativeNetRequest` changes.

## UX Summary

### Options Page - Advanced Settings Tab
- New "Advanced Settings" tab with "Website Blocklist" card.
- Empty list by default.
- Add input accepts:
  - Domain names: `example.com`, `www.example.com`, `sub.example.com`
  - Wildcard patterns: `*.example.com` (matches `a.example.com`, `b.example.com`, etc.)
  - Full URLs: protocol stripped during normalization
- Inline delete button per entry.
- Autosave on add/remove.

### Extension Popup
- "Disable on this site" button.
- On click: extracts current tab domain, normalizes, adds to blocklist, shows notification.
- Button state reflects blocked status.
- Hidden on `chrome://` and extension pages.

## Data Model
```ts
interface SiteBlocklistEntry {
  id: string;
  pattern: string;        // normalized lowercase
  matchType: "domain" | "wildcard" | "prefix" | "regex";
}

interface SiteBlocklistConfig {
  version: 1;
  entries: SiteBlocklistEntry[];
}
```

Storage:
- `siteBlocklistConfig` (sync): main config
- `siteBlocklistCompiled` (local): compiled matcher cache

Default: `{ version: 1, entries: [] }`

## Architecture

### Site Matching (`src/utils/siteBlocklist.js`)
New module:
- **Normalize**: strip protocol, lowercase, hostname-only.
- **Match types**:
  - `*.example.com` → wildcard (matches `a.example.com`, `b.example.com`)
  - `example.com` → domain (matches `example.com` and subdomains)
  - Full URL with `/` → prefix
  - `/regex/` → regex (with safety limits)
- **Compile**: build matcher objects, expose `shouldBypass(url)`.
- **Cache**: store compiled regexes in local storage.

### Content Script (`src/js/contentScript.js`)
1. Fetch blocklist config before attaching listeners.
2. If `shouldBypass(window.location.href)`:
   - Set `window.__tabboostDisabled = true`
   - Abort initialization (minimal message handler only)
3. Listen to `chrome.storage.onChanged` for updates; teardown if newly blocked.

### Background (`src/js/background.js`)
Message handlers:
- `getSiteBlocklistConfig`: return current config
- `setSiteBlocklistConfig`: validate, write to sync storage
- `addSiteToBlocklist`: extract domain from tab, normalize, add entry
- `isTabBlocked(tabUrl)`: check if URL matches blocklist

### Options UI (`src/options/options.html/js`)
- HTML: Advanced Settings tab with blocklist card (list, add input, delete buttons).
- JS: Load config, validate/normalize patterns, autosave on changes, show errors.

### Popup UI (`src/popup/popup.html/js`)
- Check blocked status on open.
- "Disable on this site" button: extract domain, send `addSiteToBlocklist` message.
- Update button state after changes.

### Localization
New keys: `blocklistSectionTitle`, `blocklistAddPlaceholder`, `blocklistHelper`, `blocklistDuplicateError`, `blocklistInvalidPattern`, `popupDisableOnSite`, `popupEnableOnSite`, `popupSiteAddedToBlocklist`.

## Edge Cases
- Protocol-restricted pages (`chrome://`): short-circuit gracefully, hide popup button.
- Quota limits: max 200 entries, deduplicate before save.
- Regex safety: max 256 chars, wrap in try/catch.
- Race conditions: use `await fetchSharedSyncValues` before listeners (top-level await or async IIFE).

## Testing
- Unit tests: pattern normalization, matching logic, wildcard/domain behavior.
- Integration tests: content script initialization gating, popup flow.
- Manual QA: add/remove entries, sync across profiles, teardown on mid-session changes.

## Rollout
1. Default empty list (no behavior change).
2. Migration: backfill `{ version: 1, entries: [] }` for existing users.
3. Update docs after verification.
