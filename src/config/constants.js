/**
 * TabBoost security constants configuration
 */

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

export const DANGEROUS_URL_PATTERNS = [];

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

export const DANGEROUS_FILE_TYPES = [
  ".exe",
  ".dmg",
  ".msi",
  ".app",
  ".deb",
  ".rpm",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".com",
  ".scr",
  ".vbs",
  ".vbe",
  ".js",
  ".jar",
  ".swf",
  ".xap",
];
