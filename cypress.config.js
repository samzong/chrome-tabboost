const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshot: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // Chrome extension specific setup
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          // Load the extension from build directory
          launchOptions.args.push('--load-extension=build')
          // Disable web security for testing
          launchOptions.args.push('--disable-web-security')
          // Allow running insecure content
          launchOptions.args.push('--allow-running-insecure-content')
          // Disable features that might interfere with testing
          launchOptions.args.push('--disable-features=VizDisplayCompositor')
          // Enable extension APIs
          launchOptions.args.push('--enable-extensions')
        }
        return launchOptions
      })
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
})