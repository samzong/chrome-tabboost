import { validateUrl } from '../../src/utils/utils';
import { DANGEROUS_PROTOCOLS } from '../../src/config/constants';

jest.mock('../../src/config/constants.js', () => ({
  DANGEROUS_PROTOCOLS: ['javascript:', 'data:', 'vbscript:'],
  DANGEROUS_URL_PATTERNS: [
    /javascript\s*:/i,
    /data\s*:/i,
    /vbscript\s*:/i,
    /&lt;script/i,
    /&#x3C;script/i,
    /alert\s*\(/i,
    /prompt\s*\(/i,
    /confirm\s*\(/i,
    /eval\s*\(/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /onclick\s*=/i
  ]
}));

describe('validateUrl', () => {
  test('should validate valid HTTP URL', () => {
    const url = 'http://example.com';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe(url);
  });

  test('should validate valid HTTPS URL', () => {
    const url = 'https://example.com/path?query=value#hash';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe(url);
  });

  test('should reject empty URL', () => {
    const result = validateUrl('');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('URL is empty or incorrect format');
  });

  test('should reject non-string URL', () => {
    const result = validateUrl(null);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('URL is empty or incorrect format');
  });

  test('should reject JavaScript protocol URL', () => {
    const url = 'javascript:alert(1)';
    const result = validateUrl(url);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('URL contains dangerous patterns');
  });

  test('should reject URL with XSS attacks', () => {
    const url = 'https://example.com/?q=<script>alert(1)</script>';
    const result = validateUrl(url);
    expect(result.isValid).toBe(false);
  });

  test('should correctly handle URL with special characters', () => {
    const url = 'https://example.com/path with spaces?q=value&p=123';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
  });
}); 