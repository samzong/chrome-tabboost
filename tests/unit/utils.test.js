import { validateUrl } from '../../src/utils/utils';

jest.mock('../../src/utils/i18n.js', () => ({
  getMessage: jest.fn((key) => {
    const messages = {
      'urlValidationErrorEmpty': 'URL cannot be empty and must be a string.',
      'urlValidationErrorDangerousPattern': 'URL contains potentially dangerous patterns.',
      'urlValidationErrorDangerousProtocol': 'URL protocol \'$1\' is not allowed for security reasons.',
      'urlValidationErrorInvalidFormat': 'Invalid URL format.',
      'urlValidationErrorUnsupportedProtocol': 'Protocol \'$1\' is not supported.'
    };
    return messages[key] || `Missing mocked i18n key: ${key}`;
  }),
}));

jest.mock('../../src/config/constants.js', () => ({
  DANGEROUS_PROTOCOLS: ['javascript:', 'data:', 'vbscript:'],
  DANGEROUS_URL_PATTERNS: [
    'javascript:',
    'data:',
    'vbscript:',
    '<script',
    'alert(',
    'prompt(',
    'confirm(',
    'eval(',
    'onerror=',
    'onload=',
    'onclick='
  ],
  EXCLUDED_EXTENSIONS: ['.exe', '.dll', '.bat', '.cmd', '.msi']
}));

describe('validateUrl', () => {
  test('should validate valid HTTP URL', () => {
    const url = 'http://example.com';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe('http://example.com/');
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
    expect(result.message).toBe('URL必须为非空字符串');
  });

  test('should reject non-string URL', () => {
    const result = validateUrl(null);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('URL必须为非空字符串');
  });

  test('should reject JavaScript protocol URL', () => {
    const url = 'javascript:alert("XSS")';
    const result = validateUrl(url);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('URL使用了不安全的协议');
  });

  test('should reject URL with XSS attacks', () => {
    const url = 'https://example.com/?q=<script>alert(1)</script>';
    const result = validateUrl(url);
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('URL包含潜在危险模式');
  });

  test('should correctly handle URL with special characters', () => {
    const url = 'https://example.com/path with spaces?q=value&p=123';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe('https://example.com/path%20with%20spaces?q=value&p=123');
  });
}); 