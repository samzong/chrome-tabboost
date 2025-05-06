import { localizePage } from "../utils/i18n.js";

document.addEventListener("DOMContentLoaded", () => {
  localizePage();

  const duplicateTabButton = document.getElementById("duplicateTabButton");
  const copyUrlButton = document.getElementById("copyUrlButton");
  const openOptionsButton = document.getElementById("openOptionsButton");

  duplicateTabButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    chrome.runtime.sendMessage({ action: "duplicateCurrentTab" });
    window.close();
  });

  copyUrlButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    chrome.runtime.sendMessage({ action: "copyCurrentTabUrl" });
    window.close();
  });

  openOptionsButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    chrome.runtime.sendMessage({ action: "openOptionsPage" });
    window.close();
  });
});
