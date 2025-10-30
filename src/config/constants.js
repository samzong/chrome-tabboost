/**
 * TabBoost安全常量配置
 */

// 危险协议，不允许加载
export const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "about:",
  "chrome:",
  "chrome-extension:",
  "view-source:",
];

// 危险URL模式，不允许加载
export const DANGEROUS_URL_PATTERNS = [];

// 需要排除的文件扩展名
export const EXCLUDED_EXTENSIONS = [
  ".zip",
  ".exe",
  ".dmg",
  ".pdf",
  ".doc",
  ".xls",
  ".ppt",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".js",
  ".css",
  ".json",
  ".xml",
  ".csv",
  ".ttf",
  ".woff",
];
