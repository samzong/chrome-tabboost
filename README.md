# TabBoost - Chrome Tab Enhancement Extension

<p align="center">
  <img src="src/assets/icons/icon128.png" alt="TabBoost Logo" width="200">
</p>

<p align="center">
  <b>A Chrome extension designed to improve browser tab efficiency, inspired by Arc Browser.</b>
</p>

<p align="center">
  <img alt="Chrome Web Store Version" src="https://img.shields.io/chrome-web-store/v/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe">
  <img alt="Chrome Web Store Last Updated" src="https://img.shields.io/chrome-web-store/last-updated/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
</p>

TabBoost is a Chrome extension that enhances browser tab efficiency. It provides a series of convenient features such as link preview, split-screen browsing, and tab duplication, helping you manage and use Chrome tabs more efficiently, inspired by Arc Browser.

<a href="https://www.producthunt.com/posts/tabboost?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-tabboost" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=962354&theme=light&t=1746628620421" alt="TabBoost - A&#0032;Chrome&#0032;extension&#0032;designed&#0032;to&#0032;improve&#0032;Tabs&#0032;efficiency&#0046; | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

## Features

- **🚀 Link Preview**: Preview links without leaving the current page. Hold down the `Command` key (Mac) or `Ctrl` key (Windows - configurable) and click a link to open it in a popup window on the current page.
- **📺 Split Screen Preview**: View two web pages side-by-side within a single tab. Triggered by `Shift + Command + Click` (Mac) or similar method (Windows) on a link, or activated via the extension menu. Ideal for comparing content or multitasking.
- **🧠 Smart Compatibility Handling**: Automatically detects websites that cannot be loaded in preview or split screen (due to `X-Frame-Options` or CSP restrictions) and provides options to "Open in New Tab" or add them to an "Ignore List". The ignore list can be managed in the settings.
- **💾 Web Page Save Confirmation**: Intercepts the `Command+S` (Mac) or `Ctrl+S` (Windows) save shortcut, displaying a confirmation dialog to prevent accidentally saving the webpage instead of a file. After confirmation, there is a 3-second window to use the native save function.
- **✨ Tab Duplication**: Quickly duplicate the current tab using the shortcut (`Ctrl+M` / `MacCtrl+M`).
- **🖱️ URL Copy**: Copy the current page URL to the clipboard with a single click using the shortcut (`Alt+C` / `Shift+Command+C`).
- **🚫 Save Shortcut Override**: Intercepts the native `Command/Ctrl+S` page save, replacing the disruptive dialog with a subtle bottom-right notification.
- **🔒 Enhanced Security**: Strict Content Security Policy (CSP) and URL validation mechanisms ensure extension security.

## Installation

### Chrome Web Store (Recommended)

Install the stable, reviewed official version from the Chrome Web Store:

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)](https://chromewebstore.google.com/detail/tabboost/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)

1. Visit [Chrome Web Store - TabBoost](https://chromewebstore.google.com/detail/tabboost/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)
2. Click the "Add to Chrome" button
3. Confirm the installation in the popup dialog

> In China Use [Crxsoso](https://www.crxsoso.com/Webstore/detail/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe) to install the extension.

## Usage

### Default Shortcuts

- `Ctrl+M` (Mac: `MacCtrl+M`): Duplicate current tab
- `Alt+C` (Mac: `Shift+Command+C`): Copy current webpage URL

_Note: All shortcuts can be customized on the Chrome Extension Shortcuts page (`chrome://extensions/shortcuts`)._

### Using Split Screen Preview

1. Press the split screen preview shortcut on any webpage or enable it via the extension popup.
2. The left side displays the current page. The right side can load content by clicking links on the left page.
3. Adjust the width ratio of the two views by dragging the middle separator line.

### Using Link Preview

1. Press the link preview shortcut on any link.
2. The link will be opened in a popup window on the current page.
3. Adjust the width ratio of the popup window by dragging the middle separator line.

### Using Web Page Save Confirmation

1. Press the web page save confirmation shortcut on any webpage.
2. The native save page dialog will be intercepted and a notification will be shown in the bottom right corner.
3. Click the notification to use the native save page function.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
