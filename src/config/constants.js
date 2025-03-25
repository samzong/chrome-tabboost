// constants.js - 集中管理常量配置，避免重复定义

// 危险协议列表
export const DANGEROUS_PROTOCOLS = [
  'javascript:', 
  'data:', 
  'vbscript:', 
  'file:',
  'about:',
  'blob:',
  'ftp:'
];

// 危险URL模式 - 用于检测可能的XSS攻击
export const DANGEROUS_URL_PATTERNS = [
  /<script>/i,
  /javascript:/i,
  /onerror=/i,
  /onload=/i,
  /onclick=/i,
  /onmouseover=/i,
  /eval\(/i,
  /document\.cookie/i,
  /document\.domain/i,
  /document\.write/i,
  /\balert\(/i,
  /\bprompt\(/i,
  /\bconfirm\(/i,
  /fromCharCode/i,
  /&#/i,  // HTML编码
  /%3C/i  // URL编码的 < 符号
];

// 限制域名列表 - 从iframeCompatibility.js移来
export const RESTRICTED_DOMAINS = [
  'github.com',         // 精确匹配github.com
  'facebook.com',       // 精确匹配facebook.com
  '*.facebook.com'      // 匹配facebook.com的所有子域名
]; 