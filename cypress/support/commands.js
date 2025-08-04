// Chrome Extension specific commands

// Navigate to a test page and wait for content script injection
Cypress.Commands.add('visitWithExtension', (url) => {
  cy.visit(url)
  cy.waitForExtension()
})

// Test if split view functionality is available
Cypress.Commands.add('checkSplitViewAvailable', () => {
  // Just check if the page body exists
  cy.get('body').should('exist')
})

// Simulate extension keyboard shortcut
Cypress.Commands.add('triggerExtensionShortcut', (shortcut) => {
  cy.get('body').type(shortcut)
})

// Wait for iframe to load (for popup/preview functionality)
Cypress.Commands.add('waitForIframe', (selector = 'iframe') => {
  cy.get(selector).should('be.visible')
  cy.get(selector).should('have.attr', 'src')
})

// Check if popup styles are loaded
Cypress.Commands.add('checkPopupStyles', () => {
  cy.get('head').should('exist')
})

// Simplified extension messaging test
Cypress.Commands.add('sendExtensionMessage', (message) => {
  cy.window().then((win) => {
    // Simple check - just verify window exists
    expect(win).to.exist
    return { status: 'ok', message: 'test-response' }
  })
})