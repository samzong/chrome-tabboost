export const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "about:",
  "blob:",
  "ftp:",
];

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
  /&#/i,
  /%3C/i,
];

export const RESTRICTED_DOMAINS = [

];
