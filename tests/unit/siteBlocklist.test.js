import { createEntry, shouldBypass, validatePattern } from "../../src/utils/siteBlocklist.js";

describe("siteBlocklist", () => {
  test("createEntry preserves prefix paths", () => {
    const entry = createEntry("https://example.com/admin");
    expect(entry).toBeTruthy();
    expect(entry.pattern).toBe("https://example.com/admin");
    expect(entry.matchType).toBe("prefix");
    expect(entry.key.startsWith("prefix:"));
  });

  test("prefix entries block URLs that share the prefix", () => {
    const entry = createEntry("https://example.com/admin");
    const entries = [entry];

    expect(shouldBypass("https://example.com/admin/settings", entries)).toBe(true);
    expect(shouldBypass("https://example.com/other", entries)).toBe(false);
  });

  test("regex patterns validate and match hostnames", () => {
    const validation = validatePattern("/foo.*bar/");
    expect(validation.valid).toBe(true);

    const entry = createEntry("/foo.*bar/");
    const entries = [entry];

    expect(shouldBypass("https://foo-bar.com", entries)).toBe(true);
    expect(shouldBypass("https://example.com", entries)).toBe(false);
  });

  test("wildcard subdomain entries match subdomains", () => {
    const entry = createEntry("*.example.com");
    const entries = [entry];

    expect(shouldBypass("https://example.com", entries)).toBe(true);
    expect(shouldBypass("https://www.example.com", entries)).toBe(true);
    expect(shouldBypass("https://sub.example.com", entries)).toBe(true);
    expect(shouldBypass("https://other.com", entries)).toBe(false);
  });
});
