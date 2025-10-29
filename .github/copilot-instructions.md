# Copilot Instructions for TabBoost

## Project Overview

TabBoost is a Chrome extension that enhances browser tab efficiency with features inspired by Arc Browser. The extension provides link preview, split-screen browsing, tab management, and other productivity features.

**Key Technologies:**
- Chrome Extension Manifest V3
- Vanilla JavaScript (ES2021+)
- Webpack for bundling
- Jest for testing
- ESLint for code quality

## Architecture

### Directory Structure
- `src/js/` - Core JavaScript files
  - `background.js` - Service worker (background script)
  - `contentScript.js` - Content script injected into web pages
  - `splitView/` - Split view functionality
- `src/popup/` - Extension popup UI
- `src/options/` - Extension options page
- `src/styles/` - CSS stylesheets
- `src/assets/` - Icons and other assets
- `src/_locales/` - Internationalization (i18n) files
- `tests/` - Jest test files
- `rules/` - Declarative Net Request rules

### Key Components
1. **Background Service Worker** (`background.js`) - Handles extension lifecycle, commands, and tab management
2. **Content Script** (`contentScript.js`) - Injected into web pages for link preview and split view
3. **Split View** (`splitView/`) - Side-by-side page viewing functionality
4. **Popup UI** - Quick access to extension features
5. **Options Page** - User preferences and settings

## Coding Standards

### JavaScript
- Use ES2021+ features
- Follow ESLint configuration in `.eslintrc.json`
- Indentation: 2 spaces
- Quotes: Double quotes
- Semicolons: Required
- Line endings: Unix (LF)

### Code Style
```javascript
// Use descriptive variable names
const isValidUrl = validateUrl(url);

// Use async/await for asynchronous operations
async function fetchData() {
  const result = await chrome.storage.sync.get("key");
  return result;
}

// Use Chrome Extension APIs correctly
chrome.tabs.query({ active: true }, (tabs) => {
  // Handle tabs
});
```

### Chrome Extension Best Practices
1. **Manifest V3** - Use service workers instead of background pages
2. **Content Security Policy** - Follow strict CSP defined in manifest.json
3. **Permissions** - Request minimal permissions needed
4. **Message Passing** - Use `chrome.runtime.sendMessage` for communication
5. **Storage** - Use `chrome.storage.sync` for user preferences

## Build and Test Commands

### Development
```bash
npm run dev          # Build in development mode
npm run start        # Start webpack dev server
npm run build        # Build for production
npm run clean        # Clean build artifacts
```

### Testing
```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:ci      # Run tests in CI mode
```

### Code Quality
```bash
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
# ESLint is configured but not in npm scripts - run manually if needed
```

### Release
```bash
npm run validate     # Validate build
npm run zip          # Create distribution zip
npm run release      # Build, validate, and create zip
```

## Testing Guidelines

- **Test Framework:** Jest with jsdom environment
- **Chrome API Mocking:** Use `jest-chrome` for mocking Chrome APIs
- **Coverage Targets:**
  - Statement coverage: ≥60%
  - Branch coverage: ≥50%
  - Function coverage: ≥60%
  - Line coverage: ≥60%

### Test Structure
```javascript
describe("Component or Function", () => {
  beforeEach(() => {
    // Setup mocks
    chrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({ key: "value" });
    });
  });

  test("should do something specific", () => {
    // Test implementation
  });
});
```

## Security Considerations

1. **URL Validation** - Always validate URLs before processing
2. **CSP Compliance** - Respect Content Security Policy headers
3. **XSS Prevention** - Sanitize user input and dynamic content
4. **Frame Security** - Handle X-Frame-Options correctly
5. **Permission Management** - Request minimal permissions

### Security Patterns
```javascript
// URL validation example
import { validateUrl } from "./utils/utils";

const result = validateUrl(url);
if (!result.isValid) {
  console.error("Invalid URL:", result.reason);
  return;
}
```

## Internationalization (i18n)

The extension supports multiple languages via Chrome's i18n system:
- English (en) - default
- Chinese Simplified (zh_CN)
- Chinese Traditional (zh_TW)
- Japanese (ja)
- Korean (ko)
- French (fr)
- German (de)
- Spanish (es)
- Russian (ru)
- Thai (th)

### i18n Best Practices
1. All user-facing strings should be in `src/_locales/{locale}/messages.json`
2. Use `chrome.i18n.getMessage("key")` to retrieve localized strings
3. In manifest.json, use `__MSG_key__` format
4. Always add new strings to all locale files or at minimum to English (en)

### Example Usage
```javascript
// In JavaScript
const message = chrome.i18n.getMessage("appName");

// In manifest.json
"description": "__MSG_appDesc__"

// In messages.json
{
  "appName": {
    "message": "TabBoost"
  }
}
```

## Chrome Extension Specific Guidelines

### Service Worker (background.js)
- Stateless - can be terminated and restarted
- Use `chrome.storage` for persistence
- Register event listeners at top level
- Keep it lightweight

### Content Scripts
- Run in isolated world
- Cannot access Chrome APIs directly (except few like `chrome.runtime`)
- Communicate with background via message passing
- Be careful with page modifications

### Message Passing Pattern
```javascript
// From content script to background
chrome.runtime.sendMessage({ action: "doSomething" }, (response) => {
  console.log(response);
});

// In background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "doSomething") {
    sendResponse({ result: "done" });
  }
  return true; // Keep channel open for async response
});
```

## File Naming Conventions

- JavaScript files: camelCase (e.g., `contentScript.js`, `splitViewCore.js`)
- CSS files: camelCase or kebab-case (e.g., `popupStyles.css`, `split-view.css`)
- Test files: `*.test.js` or in `tests/` directory
- Config files: As per convention (e.g., `.eslintrc.json`, `webpack.config.js`)

## Common Patterns

### Storage Access
```javascript
// Get from storage
const settings = await chrome.storage.sync.get(["key1", "key2"]);

// Set to storage
await chrome.storage.sync.set({ key: "value" });
```

### Tab Operations
```javascript
// Get active tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

// Duplicate tab
await chrome.tabs.duplicate(tab.id);
```

### Command Handling
```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === "duplicate-tab") {
    // Handle duplicate tab command
  }
});
```

## Dependencies

The project uses Yarn as the package manager. Key dependencies include:
- Webpack and related loaders for bundling
- Babel for JavaScript transpilation
- Jest and testing utilities
- ESLint and Prettier for code quality

## Important Notes

1. **No jQuery or React** - This is a vanilla JavaScript project
2. **Manifest V3 Only** - Don't suggest Manifest V2 patterns
3. **Chrome Extension Context** - Code runs in extension context, not normal web page context
4. **Testing Documentation** - See `docs/testing-guide.md` (in Chinese) for detailed testing guidelines
5. **Build Artifacts** - The `build/` directory is generated and git-ignored

## When Making Changes

1. **Test Locally** - Load the extension in Chrome via `chrome://extensions`
2. **Run Tests** - Ensure all tests pass with `npm test`
3. **Check Formatting** - Run `npm run format:check`
4. **Build Production** - Verify production build works with `npm run build`
5. **Update i18n** - Add new strings to all locale files
6. **Consider Security** - Review security implications of changes
7. **Update Tests** - Add/update tests for new functionality

## Resources

- Chrome Extension Documentation: https://developer.chrome.com/docs/extensions/
- Manifest V3 Migration: https://developer.chrome.com/docs/extensions/mv3/intro/
- Chrome Extension APIs: https://developer.chrome.com/docs/extensions/reference/
