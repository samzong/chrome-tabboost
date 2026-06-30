import { getPreviewTargetUrl } from "../utils/preview-frame.js";

const targetUrl = getPreviewTargetUrl();
const frame = document.getElementById("preview-frame");
const error = document.getElementById("preview-error");
const errorMessage = document.getElementById("preview-error-message");
const openTabButton = document.getElementById("preview-open-tab");

function showError(message) {
  errorMessage.textContent = message;
  error.hidden = false;
  frame.hidden = true;
}

if (!targetUrl) {
  showError("Invalid preview URL.");
} else {
  openTabButton.addEventListener("click", () => {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  });
  frame.addEventListener("error", () => {
    showError("Cannot load this website in preview.");
  });
  frame.src = targetUrl;
}
