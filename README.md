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

## Features

- **🚀 Link Preview**: Preview links without leaving the current page. Hold down the `Command` key (Mac) or `Ctrl` key (Windows - configurable) and click a link to open it in a popup window on the current page.
- **📺 Split Screen Mode**: View two web pages side-by-side within a single tab. Triggered by `Shift + Command + Click` (Mac) or similar method (Windows) on a link, or activated via the extension menu. Ideal for comparing content or multitasking.
- **🧠 Smart Compatibility Handling**: Automatically detects websites that cannot be loaded in preview or split screen (due to `X-Frame-Options` or CSP restrictions) and provides options to "Open in New Tab" or add them to an "Ignore List". The ignore list can be managed in the settings.
- **💾 Web Page Save Confirmation**: Intercepts the `Command+S` (Mac) or `Ctrl+S` (Windows) save shortcut, displaying a confirmation dialog to prevent accidentally saving the webpage instead of a file. After confirmation, there is a 3-second window to use the native save function.
- **✨ Tab Duplication**: Quickly duplicate the current tab using the shortcut (`Ctrl+M` / `MacCtrl+M`).
- **🖱️ URL Copy**: Copy the current page URL to the clipboard with a single click using the shortcut (`Alt+C` / `Shift+Command+C`).
- **🚫 Save Shortcut Override**: Intercepts the native `Command/Ctrl+S` page save, replacing the disruptive dialog with a subtle bottom-right notification.
- **🔧 Highly Customizable**:
    - Configure the default action when clicking the extension icon.
    - Adjust the size of the preview popup window.
    - Enable/disable specific features (like split screen, ignore list).
    - Customize shortcuts in `chrome://extensions/shortcuts`.
- **🔒 Enhanced Security**: Strict Content Security Policy (CSP) and URL validation mechanisms ensure extension security.

## Installation

### Chrome Web Store (Recommended)

Install the stable, reviewed official version from the Chrome Web Store:

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)](https://chromewebstore.google.com/detail/tabboost/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)

1. Visit [Chrome Web Store - TabBoost](https://chromewebstore.google.com/detail/tabboost/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)
2. Click the "Add to Chrome" button
3. Confirm the installation in the popup dialog

### Development

If you want to try the latest features or prefer not to install via the Chrome Web Store, use the following methods:

1. **Download from GitHub Releases:**
   - Visit the [GitHub Releases](https://github.com/samzong/chrome-tabboost/releases) page
   - Download the latest version of the `chrome-tabboost-v*.crx` file
   - Drag and drop the file onto Chrome's extensions page (`chrome://extensions/`)

2. **Load Unpacked Extension using Developer Mode:**
   - Download the `chrome-tabboost-v*.zip` or `crx` file from GitHub Releases and unzip it
   - Enter `chrome://extensions/` in the Chrome address bar
   - Enable "Developer mode" in the top right corner
   - Click the "Load unpacked" button
   - Select the unzipped directory

> **Note:** Installing via non-Chrome Web Store methods may trigger warning prompts. This is normal, as Chrome defaults to trusting only extensions from the store.

## Usage

### Main Features

- **Link Preview**: Hold down `Command` (Mac) or `Ctrl` (Windows) and click any link.
- **Split Screen Mode**: Hold down `Shift + Command` (Mac) and click any link, or activate via the extension popup menu.
- **Web Page Save Confirmation**: Intercepts the native save page function when you press `Command+S` (Mac) or `Ctrl+S` (Windows).
- **Save Shortcut Override**: Intercepts the native `Command/Ctrl+S` page save, replacing the disruptive dialog with a subtle bottom-right notification.

### Default Shortcuts

- `Ctrl+M` (Mac: `MacCtrl+M`): Duplicate current tab
- `Alt+C` (Mac: `Shift+Command+C`): Copy current webpage URL

*Note: All shortcuts can be customized on the Chrome Extension Shortcuts page (`chrome://extensions/shortcuts`).*

### Using Split Screen Mode

1. Press the split screen mode shortcut on any webpage or enable it via the extension popup.
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

## Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/samzong/chrome-tabboost.git
cd chrome-tabboost

# Install dependencies
npm install

# Run the development server (with hot reloading)
npm run dev

# Or start the development mode build
# npm run start

# Build the production version
npm run build

# Run tests
npm run test
```

## Contribution Guide

Suggestions for improvements or code contributions to this project are welcome. Please participate through the following steps:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`npm run commit` for standardized commits)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
