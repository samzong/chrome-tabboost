# TabBoost Extension E2E Testing

## Overview

Cypress E2E tests for TabBoost Chrome extension covering build validation and functionality testing.

## Test Suites

### 1. Extension Build Tests (`extension-build.cy.js`)
Validates extension build artifacts and installation readiness:
- ✅ Manifest validation (v3 compliance)
- ✅ Required files presence (background.js, contentScript.js, popup.html, options.html)
- ✅ Extension pages structure validation
- ✅ Chrome Web Store compatibility (icons, localization)

### 2. Functionality Tests (`extension-functionality.cy.js`)
Tests extension features on real websites (kubernetes.io):
- ✅ Content script injection
- ✅ Popup view functionality simulation
- ✅ Split view keyboard shortcuts
- ✅ Extension context availability
- ✅ Page interaction capabilities
- ✅ Installation readiness validation

## Running Tests

### All Tests
```bash
make e2e                    # Run all E2E tests
npm run e2e                 # Alternative npm command
```

### Specific Test Suites
```bash
make e2e-build             # Build validation only
make e2e-func              # Functionality tests only
make e2e-open              # Open Cypress test runner

npm run e2e:build          # Build validation (npm)
npm run e2e:functionality  # Functionality tests (npm)
npm run e2e:open           # Test runner (npm)
```

### Development
```bash
make e2e-open              # Interactive test development
make clean-test            # Clean test artifacts
```

## Test Environment

- **Browser**: Chrome (required for extension APIs)
- **Test Site**: https://kubernetes.io/docs/ (real-world testing)
- **Local Server**: http://localhost:8080 (for build artifact testing)

## Test Architecture

### Build Tests
- Uses local HTTP server to serve build artifacts
- Validates manifest structure and file presence
- Tests extension pages without Chrome APIs

### Functionality Tests
- Tests against live kubernetes.io website
- Simulates user interactions (Cmd+Click, keyboard shortcuts)
- Validates extension compatibility and injection

## Limitations

Current tests focus on:
- ✅ Build validation and file structure
- ✅ Basic functionality simulation
- ✅ Page compatibility testing

Future enhancements could add:
- 🔄 Full Chrome extension context loading
- 🔄 Real popup/split-view interaction testing
- 🔄 Cross-browser compatibility testing

## Test Output

- **Videos**: `cypress/videos/` (test recordings)
- **Screenshots**: `cypress/screenshots/` (failure captures)
- **Logs**: Console output with ✅/ℹ️ status indicators

## Maintenance

Tests automatically:
- Build extension before running
- Start/stop HTTP server for build tests
- Clean up processes after completion
- Generate video recordings for debugging