import {
  buildPreviewFrameUrl,
  getPreviewTargetUrl,
} from "../../src/utils/preview-frame.js";

describe("preview frame URLs", () => {
  const originalGetURL = chrome.runtime.getURL;

  beforeEach(() => {
    chrome.runtime.getURL = jest.fn((path) => `chrome-extension://test-id/${path}`);
  });

  afterEach(() => {
    chrome.runtime.getURL = originalGetURL;
  });

  test("wraps a remote URL in the extension preview page", () => {
    const result = buildPreviewFrameUrl("https://example.com/path?q=1");

    expect(result).toBe(
      "chrome-extension://test-id/preview.html?url=https%3A%2F%2Fexample.com%2Fpath%3Fq%3D1"
    );
  });

  test("keeps same-origin targets in the host page frame", () => {
    const result = buildPreviewFrameUrl(
      "https://x.com/yihong0618/status/2071365495505432840",
      "https://x.com/dingyi/status/2071386326788927887"
    );

    expect(result).toBe("https://x.com/yihong0618/status/2071365495505432840");
  });

  test("wraps cross-origin targets from the host page", () => {
    const result = buildPreviewFrameUrl(
      "https://github.com/lycorp-jp/sim-use",
      "https://x.com/onevcat/status/2071500722324336659"
    );

    expect(result).toBe(
      "chrome-extension://test-id/preview.html?url=https%3A%2F%2Fgithub.com%2Flycorp-jp%2Fsim-use"
    );
  });

  test("rejects unsupported target protocols", () => {
    expect(buildPreviewFrameUrl("chrome://extensions")).toBe("");
  });

  test("extracts a valid target URL from preview search params", () => {
    const result = getPreviewTargetUrl(
      "?url=https%3A%2F%2Fexample.com%2Fpath%3Fq%3D1"
    );

    expect(result).toBe("https://example.com/path?q=1");
  });
});
