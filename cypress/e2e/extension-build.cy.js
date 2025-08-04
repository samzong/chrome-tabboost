describe('TabBoost Extension - Build & Install Test', () => {
  it('should build extension successfully', () => {
    // Verify build artifacts exist and are valid
    cy.request('/build/manifest.json').then((response) => {
      expect(response.status).to.eq(200)
      const manifest = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
      
      // Validate manifest structure
      expect(manifest).to.have.property('manifest_version', 3)
      expect(manifest).to.have.property('name')
      expect(manifest).to.have.property('version')
      expect(manifest).to.have.property('background')
      expect(manifest).to.have.property('content_scripts')
      expect(manifest).to.have.property('permissions')
      
      cy.log('✅ Manifest valid: ' + manifest.name + ' v' + manifest.version)
    })
  })

  it('should have all required extension files', () => {
    const requiredFiles = [
      '/build/background.js',
      '/build/contentScript.js', 
      '/build/popup.html',
      '/build/options.html'
    ]

    requiredFiles.forEach(file => {
      cy.request(file).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.not.be.empty
        cy.log('✅ File exists: ' + file)
      })
    })
  })

  it('should validate extension pages structure', () => {
    // Test popup page HTML structure (ignore Chrome API errors)
    cy.visit('/build/popup.html', {
      failOnStatusCode: false,
      onBeforeLoad: (win) => {
        // Mock chrome API to prevent errors
        win.chrome = {
          runtime: { getManifest: () => ({}) },
          i18n: { getMessage: () => 'Mock' },
          storage: { sync: { get: () => {}, set: () => {} } }
        }
      }
    })
    cy.get('body').should('exist')
    cy.get('html').should('be.visible')
    cy.log('✅ Popup page structure valid')

    // Test options page structure
    cy.visit('/build/options.html', {
      failOnStatusCode: false,
      onBeforeLoad: (win) => {
        // Mock chrome API to prevent errors
        win.chrome = {
          runtime: { getManifest: () => ({}) },
          i18n: { getMessage: () => 'Mock' },
          storage: { sync: { get: () => {}, set: () => {} } }
        }
      }
    })
    cy.get('body').should('exist')
    cy.get('html').should('be.visible')
    cy.log('✅ Options page structure valid')
  })

  it('should have proper file structure for Chrome Web Store', () => {
    // Check required assets
    const assetFiles = [
      '/build/assets/icons/icon16.png',
      '/build/assets/icons/icon48.png', 
      '/build/assets/icons/icon128.png'
    ]

    assetFiles.forEach(asset => {
      cy.request(asset).then((response) => {
        expect(response.status).to.eq(200)
        cy.log('✅ Asset exists: ' + asset)
      })
    })

    // Check localization files
    cy.request('/build/_locales/en/messages.json').then((response) => {
      expect(response.status).to.eq(200)
      const messages = typeof response.body === 'string' ? JSON.parse(response.body) : response.body
      expect(messages).to.have.property('appName')
      cy.log('✅ Localization files present')
    })
  })
})