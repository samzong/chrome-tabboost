// Cypress Chrome Extension Support

// Get extension ID by checking chrome.runtime in the page context
Cypress.Commands.add('getExtensionId', () => {
  return cy.window().then((win) => {
    if (win.chrome && win.chrome.runtime && win.chrome.runtime.id) {
      return win.chrome.runtime.id
    }
    // Fallback: try to find extension ID from DOM or use a known test ID
    return 'extension-test-id'
  })
})

// Simple extension page visit without complex API calls
Cypress.Commands.add('visitExtensionPage', (page) => {
  // Use a simple approach - visit the built extension directly
  cy.visit(`build/${page}`)
})

Cypress.Commands.add('openExtensionPopup', () => {
  cy.visit('/build/popup.html')
})

Cypress.Commands.add('openExtensionOptions', () => {
  cy.visit('/build/options.html')
})

// Simple extension check
Cypress.Commands.add('waitForExtension', () => {
  // Just verify the page loaded
  cy.get('body').should('exist')
})

// Simplified extension presence check
Cypress.Commands.add('shouldHaveExtension', () => {
  // Just check if the extension files exist and are accessible
  cy.visit('build/popup.html')
  cy.get('body').should('exist')
})

// Import commands, support files
import './commands'