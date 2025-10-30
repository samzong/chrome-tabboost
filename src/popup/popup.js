import { localizePage, getMessage } from "../utils/i18n.js";
import { getCommandShortcuts, formatShortcut } from "../utils/commands.js";

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
      const mutedCount = audioTabs.filter((tab) => tab.mutedInfo?.muted).length;
      const mostlyMuted = mutedCount > audioTabs.length / 2;

      muteAllButton.textContent =
        getMessage(mostlyMuted ? "unmuteTab" : "muteTab") +
        ` (${audioTabs.length})`;
    } else {
      muteAllButton.textContent = getMessage("muteAllAudioTabs");
    }
  } catch (error) {
    console.error("Failed to update mute all button:", error);
  }
}

/**
 * Update button text to display corresponding shortcuts
 * @param {Object} buttons
 * @param {Object} shortcuts
 */
async function updateButtonsWithShortcuts(buttons, shortcuts) {
  try {
    const commandToButtonMap = {
      "duplicate-tab": "duplicateTabButton",
      "copy-url": "copyUrlButton",
      "toggle-mute-current-tab": "muteTabButton",
      "toggle-mute-all-audio-tabs": "muteAllAudioButton",
    };

    for (const [command, buttonId] of Object.entries(commandToButtonMap)) {
      const button = buttons[buttonId];
      if (!button) continue;

      const shortcut = shortcuts[command];
      if (shortcut) {
        const formattedShortcut = formatShortcut(shortcut);

        const originalText = button.textContent;
        const textWithoutShortcut = originalText.replace(/ \([^)]*\)$/, "");
        button.textContent = `${textWithoutShortcut} (${formattedShortcut})`;
      }
    }
  } catch (error) {
    console.error("Failed to update button shortcuts:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  localizePage();

  const buttons = {
    duplicateTabButton: document.getElementById("duplicateTabButton"),
    copyUrlButton: document.getElementById("copyUrlButton"),
    muteTabButton: document.getElementById("muteTabButton"),
    muteAllAudioButton: document.getElementById("muteAllAudioButton"),
    openOptionsButton: document.getElementById("openOptionsButton"),
  };

  await updateMuteButtonText(buttons.muteTabButton);
  await updateMuteAllButton(buttons.muteAllAudioButton);

  const shortcuts = await getCommandShortcuts();
  await updateButtonsWithShortcuts(buttons, shortcuts);

  buttons.duplicateTabButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage({ action: "duplicateCurrentTab" });
    window.close();
  });

  buttons.copyUrlButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage({ action: "copyCurrentTabUrl" });
    window.close();
  });

  buttons.muteTabButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage({ action: "toggleMuteCurrentTab" });
    window.close();
  });

  buttons.muteAllAudioButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage({ action: "toggleMuteAllAudioTabs" });
    window.close();
  });

  buttons.openOptionsButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    chrome.runtime.sendMessage({ action: "openOptionsPage" });
    window.close();
  });
});
