/**
 * Site blocklist matching utility
 */

const DEFAULT_BLOCKLIST = {
  version: 1,
  entries: [],
};

const MAX_HOST_PATTERN_LENGTH = 256;
const MAX_REGEX_LENGTH = 256;

function trimmedPattern(pattern) {
  if (!pattern || typeof pattern !== "string") {
    return "";
  }
  return pattern.trim();
}

function canonicalizeUrlFromUrlObj(urlObj) {
  if (!urlObj || !urlObj.protocol || !urlObj.hostname) {
    return "";
  }

  const protocol = urlObj.protocol.toLowerCase();
  const hostname = urlObj.hostname.toLowerCase();
  const port = urlObj.port ? `:${urlObj.port}` : "";
  const pathname = urlObj.pathname || "/";
  const search = urlObj.search || "";
  const hash = urlObj.hash || "";

  return `${protocol}//${hostname}${port}${pathname}${search}${hash}`;
}

function canonicalizeUrlString(pattern) {
  try {
    const url = new URL(pattern);
    return canonicalizeUrlFromUrlObj(url);
  } catch {
    return "";
  }
}

function buildEntryKey(pattern, matchType) {
  const raw = trimmedPattern(pattern);
  if (!raw) {
    return "";
  }

  const resolvedMatchType = matchType || inferMatchType(raw);

  if (resolvedMatchType === "regex") {
    return `regex:${raw}`;
  }

  if (resolvedMatchType === "prefix") {
    const canonical = canonicalizeUrlString(raw);
    if (canonical) {
      return `prefix:${canonical}`;
    }
    const normalizedFallback = normalizePattern(raw);
    return normalizedFallback ? `domain:${normalizedFallback}` : "";
  }

  const normalized = normalizePattern(raw);
  if (!normalized) {
    return "";
  }

  return `${resolvedMatchType}:${normalized}`;
}

function escapeRegex(value) {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function ensureEntryKey(entry) {
  if (!entry) {
    return "";
  }
  if (entry.key) {
    return entry.key;
  }
  const raw = trimmedPattern(entry.pattern);
  const matchType = entry.matchType || inferMatchType(raw);
  return buildEntryKey(raw, matchType);
}

/**
 * Normalize pattern: strip protocol, lowercase, hostname-only
 */
export function normalizePattern(pattern) {
  if (!pattern || typeof pattern !== "string") {
    return "";
  }

  let normalized = pattern.trim().toLowerCase();

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    if (normalized.includes("*")) {
      normalized = normalized.replace(/^https?:\/\//, "");
    } else {
      try {
        const url = new URL(normalized);
        normalized = url.hostname;
      } catch {
        normalized = normalized.replace(/^https?:\/\//, "");
      }
    }
  }

  normalized = normalized.split("/")[0].split("?")[0].split("#")[0];

  return normalized;
}

/**
 * Infer match type from pattern
 */
export function inferMatchType(pattern) {
  const raw = trimmedPattern(pattern);
  if (!raw) {
    return "domain";
  }

  if (raw.startsWith("*.")) {
    return "wildcard";
  }

  if (raw.startsWith("/") && raw.endsWith("/") && raw.length >= 2) {
    return "regex";
  }

  if (raw.includes("/") && (raw.startsWith("http://") || raw.startsWith("https://"))) {
    return "prefix";
  }

  return "domain";
}

/**
 * Build matcher from entries
 */
export function buildMatcher(entries = []) {
  const matchers = [];

  for (const entry of entries) {
    if (!entry) continue;

    const raw = trimmedPattern(entry.pattern);
    if (!raw) continue;

    const matchType = entry.matchType || inferMatchType(raw);
    let normalized = null;

    if (matchType === "regex") {
      const source = raw.slice(1, -1);
      if (!source || source.length > MAX_REGEX_LENGTH) {
        continue;
      }

      try {
        const regex = new RegExp(source, "i");
        matchers.push({
          type: "regex",
          test: ({ hostname }) => regex.test(hostname),
        });
      } catch {
        // Skip invalid regex
      }
      continue;
    }

    if (matchType === "prefix") {
      const canonical = canonicalizeUrlString(raw);
      if (canonical) {
        matchers.push({
          type: "prefix",
          test: ({ href }) => href.startsWith(canonical),
        });
        continue;
      }

      normalized = normalizePattern(raw);
      if (!normalized) {
        continue;
      }

      matchers.push({
        type: "legacy-prefix-domain",
        domain: normalized,
        test: ({ hostname }) => hostname === normalized || hostname.endsWith(`.${normalized}`),
      });
      continue;
    }

    normalized = normalized || normalizePattern(raw);
    if (!normalized) {
      continue;
    }

    if (matchType === "wildcard") {
      if (raw.startsWith("*.")) {
        const domain = normalized.replace(/^\*\./, "");
        if (!domain) {
          continue;
        }
        matchers.push({
          type: "wildcard-subdomain",
          domain,
          test: ({ hostname }) => hostname === domain || hostname.endsWith(`.${domain}`),
        });
        continue;
      }
    }

    matchers.push({
      type: "domain",
      domain: normalized,
      test: ({ hostname }) => hostname === normalized || hostname.endsWith(`.${normalized}`),
    });
  }

  return matchers;
}

/**
 * Check if URL should be bypassed
 */
export function shouldBypass(url, entries) {
  if (!url || !entries || entries.length === 0) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const href = canonicalizeUrlFromUrlObj(urlObj);

    if (!hostname || !href) {
      return false;
    }

    const matchers = buildMatcher(entries);
    const context = { hostname, href, url: urlObj };
    return matchers.some((matcher) => matcher.test(context));
  } catch {
    return false;
  }
}

/**
 * Create blocklist entry from pattern
 */
export function createEntry(pattern) {
  const validation = validatePattern(pattern);
  if (!validation.valid) {
    return null;
  }

  const raw = trimmedPattern(pattern);
  const matchType = inferMatchType(raw);
  const key = buildEntryKey(raw, matchType);
  if (!key) {
    return null;
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    pattern: raw,
    matchType,
    key,
  };
}

/**
 * Validate pattern
 */
export function validatePattern(pattern) {
  const raw = trimmedPattern(pattern);
  if (!raw) {
    return { valid: false, error: "Empty pattern" };
  }

  const matchType = inferMatchType(raw);

  if (matchType === "regex") {
    if (raw.length < 3) {
      return { valid: false, error: "Empty regex" };
    }
    try {
      new RegExp(raw.slice(1, -1));
    } catch {
      return { valid: false, error: "Invalid regex" };
    }
    return { valid: true };
  }

  const normalized = normalizePattern(raw);
  if (!normalized) {
    return { valid: false, error: "Empty pattern" };
  }

  if (normalized.length > MAX_HOST_PATTERN_LENGTH) {
    return { valid: false, error: "Pattern too long" };
  }

  if (matchType === "prefix") {
    const canonical = canonicalizeUrlString(raw);
    if (!canonical) {
      return { valid: false, error: "Invalid URL" };
    }
  }

  return { valid: true };
}

export function getEntryKey(entry) {
  if (typeof entry === "string") {
    return buildEntryKey(entry);
  }
  return ensureEntryKey(entry);
}

export { DEFAULT_BLOCKLIST };
