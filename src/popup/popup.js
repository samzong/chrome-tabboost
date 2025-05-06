import { localizePage, getMessage } from "../utils/i18n.js";

async function updateMuteButtonText(muteButton) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0 || !muteButton) return;
    
    const tab = tabs[0];
    const isMuted = tab.mutedInfo?.muted || false;
    
    muteButton.textContent = getMessage(isMuted ? "unmuteTab" : "muteTab");
  } catch (error) {
    console.error("Failed to update mute button text:", error);
  }
}

async function updateMuteAllButton(muteAllButton) {
  try {
    if (!muteAllButton) return;
    
    const audioTabs = await chrome.tabs.query({ audible: true });
    
    muteAllButton.disabled = audioTabs.length === 0;
    
    if (audioTabs.length > 0) {
      const mutedCount = audioTabs.filter(tab => tab.mutedInfo?.muted).length;
      const mostlyMuted = mutedCount > audioTabs.length / 2;
      
      muteAllButton.textContent = getMessage(mostlyMuted ? "unmuteTab" : "muteTab") + 
                                 ` (${audioTabs.length})`;
    } else {
      muteAllButton.textContent = getMessage("muteAllAudioTabs");
    }
  } catch (error) {
    console.error("Failed to update mute all button:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  localizePage();

  const duplicateTabButton = document.getElementById("duplicateTabButton");
  const copyUrlButton = document.getElementById("copyUrlButton");
  const muteTabButton = document.getElementById("muteTabButton");
  const muteAllAudioButton = document.getElementById("muteAllAudioButton");
  const openOptionsButton = document.getElementById("openOptionsButton");

  await updateMuteButtonText(muteTabButton);
  await updateMuteAllButton(muteAllAudioButton);

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
  
  muteTabButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    chrome.runtime.sendMessage({ action: "toggleMuteCurrentTab" });
    window.close();
  });
  
  muteAllAudioButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    chrome.runtime.sendMessage({ action: "toggleMuteAllAudioTabs" });
    window.close();
  });

  openOptionsButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    chrome.runtime.sendMessage({ action: "openOptionsPage" });
    window.close();
  });
});
