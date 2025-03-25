// utils.test.js - 工具函数单元测试
import { validateUrl } from '../../src/utils/utils';
import { DANGEROUS_PROTOCOLS } from '../../src/config/constants';

// 模拟constants.js中的常量
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

describe('validateUrl函数', () => {
  test('应该验证合法的HTTP URL', () => {
    const url = 'http://example.com';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe(url);
  });

  test('应该验证合法的HTTPS URL', () => {
    const url = 'https://example.com/path?query=value#hash';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe(url);
  });

  test('应该拒绝空URL', () => {
    const result = validateUrl('');
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('URL为空或格式不正确');
  });

  test('应该拒绝非字符串URL', () => {
    const result = validateUrl(null);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('URL为空或格式不正确');
  });

  test('应该拒绝JavaScript协议URL', () => {
    const url = 'javascript:alert(1)';
    const result = validateUrl(url);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('URL包含危险模式');
  });

  test('应该拒绝包含XSS攻击的URL', () => {
    const url = 'https://example.com/?q=<script>alert(1)</script>';
    const result = validateUrl(url);
    expect(result.isValid).toBe(false);
  });

  test('应该正确处理带有特殊字符的URL', () => {
    const url = 'https://example.com/path with spaces?q=value&p=123';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
  });
}); 