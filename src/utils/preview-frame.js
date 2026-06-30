import { validateUrl } from "./url-validation.js";

export function buildPreviewFrameUrl(url, embedderUrl) {
  const { isValid, sanitizedUrl } = validateUrl(url);
  if (!isValid) {
    return "";
  }

  const parentUrl = embedderUrl || globalThis.location?.href || "";

  if (parentUrl) {
    try {
      if (new URL(sanitizedUrl).origin === new URL(parentUrl).origin) {
        return sanitizedUrl;
      }
    } catch {}
  }

  if (
    typeof chrome === "undefined" ||
    !chrome.runtime ||
    typeof chrome.runtime.getURL !== "function"
  ) {
    return sanitizedUrl;
  }

  const previewUrl = new URL(chrome.runtime.getURL("preview.html"));
  previewUrl.searchParams.set("url", sanitizedUrl);
  return previewUrl.href;
}

export function getPreviewTargetUrl(locationSearch = window.location.search) {
  const params = new URLSearchParams(locationSearch);
  const rawUrl = params.get("url") || "";
  const validationResult = validateUrl(rawUrl);
  return validationResult.isValid ? validationResult.sanitizedUrl : "";
}
