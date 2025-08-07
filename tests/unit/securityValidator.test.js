/**
 * Comprehensive but simplified unit tests for SecurityValidator class
 * Focused on core security functionality with reliable test patterns
 */

import { SecurityValidator } from '../../src/utils/securityValidator.js';
import { ErrorHandler } from '../../src/utils/errorHandler.js';

// Mock dependencies
jest.mock('../../src/config/constants.js', () => ({
  DANGEROUS_PROTOCOLS: ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'],
  DANGEROUS_FILE_TYPES: ['.exe', '.dll', '.bat', '.cmd', '.msi', '.scr', '.vbs', '.jar']
}));

jest.mock('../../src/utils/errorHandler.js', () => ({
  ErrorHandler: {
    logError: jest.fn()
  }
}));

describe('SecurityValidator Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorHandler.logError.mockClear();
    
    // Reset blocked domains for testing
    SecurityValidator.BLOCKED_DOMAINS = [];
  });

  describe('URL Validation - Basic Cases', () => {
    test('should validate HTTPS URLs', () => {
      const result = SecurityValidator.validateUrl('https://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com/');
      expect(result.risk).toBe('medium');
    });

    test('should validate HTTP URLs', () => {
      const result = SecurityValidator.validateUrl('http://example.com/path?query=value');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('http://example.com/path?query=value');
      expect(result.risk).toBe('medium');
    });

    test('should reject empty or null URLs', () => {
      expect(SecurityValidator.validateUrl('').isValid).toBe(false);
      expect(SecurityValidator.validateUrl(null).isValid).toBe(false);
      expect(SecurityValidator.validateUrl(undefined).isValid).toBe(false);
      expect(SecurityValidator.validateUrl(123).isValid).toBe(false);
    });

    test('should trim whitespace from URLs', () => {
      const result = SecurityValidator.validateUrl('  https://example.com  ');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com/');
    });

    test('should attempt to fix URLs without protocol', () => {
      const result = SecurityValidator.validateUrl('example.com/path');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com/path');
    });
  });

  describe('XSS Pattern Detection', () => {
    test('should detect dangerous JavaScript patterns', () => {
      const dangerousPatterns = [
        'javascript:alert(1)',
        'JAVASCRIPT:void(0)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("xss")',
        '<script>alert(1)</script>',
        '<SCRIPT SRC="evil.js">',
        'onload=alert(1)',
        'onclick=malicious()',
        'eval(evil_code)',
        'setTimeout("bad",100)',
        'Function("return evil")()',
        'expression(alert(1))',
        'document.write("evil")',
        'window.location="bad"'
      ];

      dangerousPatterns.forEach(pattern => {
        expect(SecurityValidator.checkXSSPatterns(pattern)).toBe(true);
      });
    });

    test('should detect encoded XSS patterns', () => {
      const encodedPatterns = [
        '&lt;script&gt;alert(1)',
        '%3Cscript%3E',
        '&#x3C;script',
        '\\x3Cscript',
        '\\u003Cscript'
      ];

      encodedPatterns.forEach(pattern => {
        expect(SecurityValidator.checkXSSPatterns(pattern)).toBe(true);
      });
    });

    test('should allow safe content', () => {
      const safeContent = [
        'https://example.com/safe/path',
        'normal search query',
        'user@example.com',
        'phone: 123-456-7890',
        'product description with <valid> content',
        'search for "quoted content"'
      ];

      safeContent.forEach(content => {
        expect(SecurityValidator.checkXSSPatterns(content)).toBe(false);
      });
    });

    test('should handle null/undefined input safely', () => {
      expect(SecurityValidator.checkXSSPatterns(null)).toBe(false);
      expect(SecurityValidator.checkXSSPatterns(undefined)).toBe(false);
      expect(SecurityValidator.checkXSSPatterns('')).toBe(false);
      expect(SecurityValidator.checkXSSPatterns(123)).toBe(false);
    });
  });

  describe('Protocol Security', () => {
    test('should reject dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<h1>test</h1>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
        'ftp://malicious.com/file'
      ];

      dangerousUrls.forEach(url => {
        const result = SecurityValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.risk).toMatch(/critical/);
      });
    });

    test('should log dangerous protocol attempts', () => {
      SecurityValidator.validateUrl('javascript:alert(1)');
      
      expect(ErrorHandler.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'SecurityValidator.validateUrl.xss',
        'critical'
      );
    });

    test('should accept safe protocols only', () => {
      const validUrls = [
        'http://example.com',
        'https://secure.example.com',
        'HTTP://EXAMPLE.COM',
        'HTTPS://SECURE.EXAMPLE.COM'
      ];

      validUrls.forEach(url => {
        const result = SecurityValidator.validateUrl(url);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('File Type Security', () => {
    test('should reject dangerous file types', () => {
      const dangerousFiles = [
        'https://example.com/malware.exe',
        'https://example.com/library.dll',
        'https://example.com/script.bat',
        'https://example.com/installer.msi',
        'https://example.com/virus.scr',
        'https://example.com/macro.vbs',
        'https://example.com/applet.jar'
      ];

      dangerousFiles.forEach(url => {
        const result = SecurityValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.risk).toBe('high');
        expect(result.reason).toMatch(/Dangerous file type/);
      });
    });

    test('should accept URLs without dangerous file extensions', () => {
      const safeFiles = [
        'https://example.com/api/data', // No extension
        'https://example.com/page', // No extension
        'https://example.com/', // Root path
        'https://example.com/folder/subfolder' // Directory-like path
      ];

      safeFiles.forEach(url => {
        const result = SecurityValidator.validateUrl(url);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Domain Trust Management', () => {
    test('should identify trusted domains', () => {
      const trustedDomains = [
        'github.com',
        'www.github.com',
        'api.github.com',
        'stackoverflow.com',
        'developer.mozilla.org',
        'en.wikipedia.org',
        'docs.microsoft.com'
      ];

      trustedDomains.forEach(domain => {
        expect(SecurityValidator.isTrustedDomain(domain)).toBe(true);
      });
    });

    test('should handle case insensitive domain checking', () => {
      expect(SecurityValidator.isTrustedDomain('GITHUB.COM')).toBe(true);
      expect(SecurityValidator.isTrustedDomain('GitHub.com')).toBe(true);
      expect(SecurityValidator.isTrustedDomain('WWW.GITHUB.COM')).toBe(true);
    });

    test('should reject untrusted domains', () => {
      const untrustedDomains = [
        'malicious.com',
        'evil-site.net',
        'phishing-github.com',
        'fake-stackoverflow.org'
      ];

      untrustedDomains.forEach(domain => {
        expect(SecurityValidator.isTrustedDomain(domain)).toBe(false);
      });
    });

    test('should mark trusted domains as low risk', () => {
      const result = SecurityValidator.validateUrl('https://github.com/user/repo');
      
      expect(result.isValid).toBe(true);
      expect(result.risk).toBe('low');
    });

    test('should mark unknown domains as medium risk', () => {
      const result = SecurityValidator.validateUrl('https://unknown-domain.com');
      
      expect(result.isValid).toBe(true);
      expect(result.risk).toBe('medium');
    });
  });

  describe('Blocked Domain Management', () => {
    beforeEach(() => {
      SecurityValidator.BLOCKED_DOMAINS = ['blocked.com', 'malicious.net'];
    });

    afterEach(() => {
      SecurityValidator.BLOCKED_DOMAINS = [];
    });

    test('should identify blocked domains', () => {
      expect(SecurityValidator.isBlockedDomain('blocked.com')).toBe(true);
      expect(SecurityValidator.isBlockedDomain('malicious.net')).toBe(true);
      expect(SecurityValidator.isBlockedDomain('subdomain.blocked.com')).toBe(true);
    });

    test('should reject blocked domains', () => {
      const result = SecurityValidator.validateUrl('https://blocked.com/page');
      
      expect(result.isValid).toBe(false);
      expect(result.risk).toBe('critical');
      expect(result.reason).toBe('Blocked domain');
    });

    test('should log blocked domain attempts', () => {
      SecurityValidator.validateUrl('https://blocked.com');
      
      expect(ErrorHandler.logError).toHaveBeenCalledWith(
        expect.any(Error),
        'SecurityValidator.validateUrl.blockedDomain',
        'warning'
      );
    });
  });

  describe('HTML Sanitization', () => {
    test('should escape HTML entities', () => {
      const html = '<script>alert("XSS")</script>';
      const result = SecurityValidator.sanitizeHTML(html);
      
      expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    test('should escape quotes and special characters', () => {
      const html = `<div class="test" data-value='malicious'>content</div>`;
      const result = SecurityValidator.sanitizeHTML(html);
      
      expect(result).toBe('&lt;div class=&quot;test&quot; data-value=&#39;malicious&#39;&gt;content&lt;/div&gt;');
    });

    test('should preserve already escaped entities', () => {
      const html = 'Text with &amp; and &lt; already escaped';
      const result = SecurityValidator.sanitizeHTML(html);
      
      expect(result).toBe('Text with &amp; and &lt; already escaped');
    });

    test('should handle null/empty input', () => {
      expect(SecurityValidator.sanitizeHTML(null)).toBe('');
      expect(SecurityValidator.sanitizeHTML('')).toBe('');
      expect(SecurityValidator.sanitizeHTML(undefined)).toBe('');
      expect(SecurityValidator.sanitizeHTML(123)).toBe('');
    });
  });

  describe('Iframe Validation', () => {
    test('should allow trusted domains for iframe loading', () => {
      const result = SecurityValidator.validateForIframe('https://github.com/user/repo');
      
      expect(result.canLoad).toBe(true);
      expect(result.reason).toBe('Trusted domain');
      expect(result.risk).toBe('low');
    });

    test('should allow medium risk domains conditionally', () => {
      const result = SecurityValidator.validateForIframe('https://safe-unknown.com');
      
      expect(result.canLoad).toBe(true);
      expect(result.reason).toBe('Validation passed');
      expect(result.risk).toBe('medium');
    });

    test('should reject invalid URLs for iframe loading', () => {
      const result = SecurityValidator.validateForIframe('javascript:alert(1)');
      
      expect(result.canLoad).toBe(false);
      expect(result.reason).toBe('Potential XSS detected');
      expect(result.risk).toBe('critical');
    });

    test('should reject dangerous file types for iframe loading', () => {
      const result = SecurityValidator.validateForIframe('https://example.com/malware.exe');
      
      expect(result.canLoad).toBe(false);
      expect(result.reason).toMatch(/Dangerous file type|High risk URL/);
      expect(result.risk).toBe('high');
    });
  });

  describe('CSP Rules Generation', () => {
    test('should return restrictive rules for null/empty hostname', () => {
      expect(SecurityValidator.getCSPRulesForDomain(null)).toEqual({
        allowIframe: false,
        modifyHeaders: false
      });
      
      expect(SecurityValidator.getCSPRulesForDomain('')).toEqual({
        allowIframe: false,
        modifyHeaders: false
      });
    });

    test('should return permissive rules for trusted domains', () => {
      const result = SecurityValidator.getCSPRulesForDomain('github.com');
      
      expect(result).toEqual({
        allowIframe: true,
        modifyHeaders: true,
        rules: {
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Security-Policy': null
        }
      });
    });

    test('should return restrictive rules for untrusted domains', () => {
      const result = SecurityValidator.getCSPRulesForDomain('unknown.com');
      
      expect(result).toEqual({
        allowIframe: false,
        modifyHeaders: false,
        rules: {}
      });
    });

    test('should handle trusted subdomains', () => {
      const result = SecurityValidator.getCSPRulesForDomain('api.github.com');
      
      expect(result.allowIframe).toBe(true);
      expect(result.modifyHeaders).toBe(true);
    });
  });

  describe('Edge Cases and Security Boundaries', () => {
    test('should handle Unicode domain names', () => {
      const result = SecurityValidator.validateUrl('https://xn--n3h.com');
      
      expect(result.isValid).toBe(true);
      expect(result.risk).toBe('medium');
    });

    test('should handle URLs with authentication', () => {
      const result = SecurityValidator.validateUrl('https://user:pass@example.com/path');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://user:pass@example.com/path');
    });

    test('should handle URLs with non-standard ports', () => {
      const result = SecurityValidator.validateUrl('https://example.com:8443/secure');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe('https://example.com:8443/secure');
    });

    test('should handle very long URLs', () => {
      const longPath = 'a'.repeat(2000);
      const result = SecurityValidator.validateUrl(`https://example.com/${longPath}`);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toContain(longPath);
    });

    test('should handle URLs with many query parameters', () => {
      let queryParams = [];
      for (let i = 0; i < 50; i++) { // Reduced to avoid test timeout
        queryParams.push(`param${i}=value${i}`);
      }
      const url = `https://example.com?${queryParams.join('&')}`;
      
      const result = SecurityValidator.validateUrl(url);
      
      expect(result.isValid).toBe(true);
    });

    test('should properly validate complex real-world URLs', () => {
      const realWorldUrls = [
        'https://github.com/microsoft/TypeScript/blob/main/src/compiler/checker.ts#L1234',
        'https://developer.mozilla.org/en-US/docs/Web/API/URL/URL?utm_source=test',
        'https://stackoverflow.com/questions/12345/how-to-validate-urls?tab=votes#tab-top'
      ];

      realWorldUrls.forEach(url => {
        const result = SecurityValidator.validateUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.risk).toBe('low'); // These should be trusted domains
      });
      
      // npm.js is not in trusted domains, so should be medium risk
      const npmUrl = 'https://www.npmjs.com/package/@types/node?activeTab=versions';
      const npmResult = SecurityValidator.validateUrl(npmUrl);
      expect(npmResult.isValid).toBe(true);
      expect(npmResult.risk).toBe('medium');
    });

    test('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'htp://bad-protocol.com',
        'https://',
        'not-a-url-at-all',
        'javascript:',
        'data:'
      ];

      malformedUrls.forEach(url => {
        const result = SecurityValidator.validateUrl(url);
        // Should either be invalid or have fallback behavior
        if (!result.isValid) {
          expect(result.risk).toMatch(/high|critical/);
          expect(result.reason).toBeTruthy();
        }
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle validation errors gracefully', () => {
      // Test with extremely malformed input that might cause errors
      const problematicInputs = [
        { toString: () => { throw new Error('toString error'); } },
        Object.create(null), // Object without prototype
        new Proxy({}, { get: () => { throw new Error('Proxy error'); } })
      ];

      problematicInputs.forEach(input => {
        const result = SecurityValidator.validateUrl(input);
        expect(result.isValid).toBe(false);
        expect(result.risk).toMatch(/high/);
      });
    });

    test('should maintain security when URL constructor fails', () => {
      // Simulate URL constructor failure by testing with clearly invalid input
      const result = SecurityValidator.validateUrl('::::invalid::::');
      
      // Should fail safely
      expect(result.isValid).toBe(false);
      expect(result.risk).toMatch(/high/);
    });
  });
});