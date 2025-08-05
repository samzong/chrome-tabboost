import storageCache from "../utils/storage-cache.js";
import { localizePage, getMessage } from "../utils/i18n.js";

function showPageNotification(message, type = "success") {
  let notification = document.getElementById("page-notification");

  if (!notification) {
    notification = document.createElement("div");
    notification.id = "page-notification";
    notification.className = `page-notification ${type}`;
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.className = `page-notification ${type} show`;

  notification.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-5px)" },
      { transform: "translateX(5px)" },
      { transform: "translateX(0)" },
    ],
    {
      duration: 300,
      iterations: 2,
    }
  );

  setTimeout(() => {
    notification.className = notification.className.replace(" show", "");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  localizePage();

  const placeholderElements = document.querySelectorAll(
    "[data-i18n-placeholder]"
  );
  placeholderElements.forEach((el) => {
    const i18nKey = el.getAttribute("data-i18n-placeholder");
    if (i18nKey) {
      const placeholderText = getMessage(i18nKey);
      if (placeholderText) {
        el.setAttribute("placeholder", placeholderText);
      }
    }
  });

  updateDynamicLabels();

  initTabs();
  loadSettings();
  setupEventListeners();
});

function updateDynamicLabels() {
  updateCustomSizeLabels();
}

function updateCustomSizeLabels() {
  const widthSliderValue = customWidthSlider ? customWidthSlider.value : "80";
  const heightSliderValue = customHeightSlider
    ? customHeightSlider.value
    : "80";

  const customWidthLabel = document.getElementById("customWidthLabel");
  const customHeightLabel = document.getElementById("customHeightLabel");

  if (customWidthLabel) {
    const widthMsg = getMessage("customWidthLabel", [widthSliderValue]);
    if (widthMsg) {
      customWidthLabel.textContent = widthMsg;
    } else {
      customWidthLabel.textContent = `Custom width: ${widthSliderValue}%`;
    }
  }

  if (customHeightLabel) {
    const heightMsg = getMessage("customHeightLabel", [heightSliderValue]);
    if (heightMsg) {
      customHeightLabel.textContent = heightMsg;
    } else {
      customHeightLabel.textContent = `Custom height: ${heightSliderValue}%`;
    }
  }
}

const saveButton = document.getElementById("saveButton");
const headerModificationEnabledCheckbox = document.getElementById(
  "headerModificationEnabled"
);
const notificationsEnabledCheckbox = document.getElementById(
  "notificationsEnabled"
);

const popupSizePreset = document.getElementById("popupSizePreset");
const customWidthSlider = document.getElementById("customWidthSlider");
const customHeightSlider = document.getElementById("customHeightSlider");
const customWidthValue = document.getElementById("customWidthValue");
const customHeightValue = document.getElementById("customHeightValue");
const sizePreviewBox = document.getElementById("sizePreviewBox");

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

const popupShortcutSelect = document.getElementById("popupShortcutSelect");

function setupEventListeners() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      tabContents.forEach((content) => {
        content.classList.remove("active");
      });
      document.getElementById(`${tabId}-content`).classList.add("active");

      updateUrlWithActiveTab(tabId);
    });
  });

  if (customWidthSlider) {
    customWidthSlider.addEventListener("input", function () {
      customWidthValue.textContent = this.value + "%";
      updateCustomSizeLabels();
      updateSizePreview();
    });
  }

  if (customHeightSlider) {
    customHeightSlider.addEventListener("input", function () {
      customHeightValue.textContent = this.value + "%";
      updateCustomSizeLabels();
      updateSizePreview();
    });
  }

  if (popupSizePreset) {
    popupSizePreset.addEventListener("change", function () {
      const selectedPreset = this.value;
      const customControls = document.querySelectorAll(".custom-size-controls");

      if (selectedPreset === "custom") {
        customControls.forEach((control) => (control.style.display = "block"));
        if (customWidthSlider && customWidthValue) {
          customWidthValue.textContent = customWidthSlider.value + "%";
        }
        if (customHeightSlider && customHeightValue) {
          customHeightValue.textContent = customHeightSlider.value + "%";
        }
        updateCustomSizeLabels();
        updateSizePreview();
      } else {
        customControls.forEach((control) => (control.style.display = "none"));
        let width, height;
        if (selectedPreset === "default") {
          width = 80;
          height = 80;
        } else if (selectedPreset === "large") {
          width = 95;
          height = 95;
        }
        if (customWidthSlider) customWidthSlider.value = width;
        if (customHeightSlider) customHeightSlider.value = height;
        if (customWidthValue) customWidthValue.textContent = width + "%";
        if (customHeightValue) customHeightValue.textContent = height + "%";
        updateCustomSizeLabels();
        updateSizePreview();
      }
    });
  }

  if (popupShortcutSelect) {
    popupShortcutSelect.addEventListener("change", function () {});
  }

  saveButton.addEventListener("click", saveSettings);
}

function updateSizePreview() {
  if (sizePreviewBox) {
    const widthValue = customWidthSlider ? customWidthSlider.value : 80;
    const heightValue = customHeightSlider ? customHeightSlider.value : 80;

    sizePreviewBox.style.width = widthValue + "%";
    sizePreviewBox.style.height = heightValue + "%";
  }
}

function initTabs() {
  tabContents.forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById("general-content").classList.add("active");

  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get("tab");

  if (activeTab) {
    const targetTab = document.querySelector(`.tab[data-tab="${activeTab}"]`);
    if (targetTab) {
      targetTab.click();
    }
  }
}

function loadSettings() {
  const keys = [
    "headerModificationEnabled",
    "popupSizePreset",
    "customWidth",
    "customHeight",
    "notificationsEnabled",
  ];

  chrome.storage.sync.get(keys, (result) => {
    if (chrome.runtime.lastError) {
      return;
    }

    headerModificationEnabledCheckbox.checked =
      result.headerModificationEnabled !== undefined
        ? result.headerModificationEnabled
        : true;

    notificationsEnabledCheckbox.checked =
      result.notificationsEnabled !== undefined
        ? result.notificationsEnabled
        : true;

    const loadedPreset = result.popupSizePreset || "default";
    const loadedWidth = result.customWidth || 80;
    const loadedHeight = result.customHeight || 80;

    if (popupSizePreset) {
      popupSizePreset.value = loadedPreset;
    }
    if (customWidthSlider) {
      customWidthSlider.value = loadedWidth;
    }
    if (customHeightSlider) {
      customHeightSlider.value = loadedHeight;
    }

    const customControls = document.querySelectorAll(".custom-size-controls");
    if (loadedPreset === "custom") {
      customControls.forEach((control) => (control.style.display = "block"));
    } else {
      customControls.forEach((control) => (control.style.display = "none"));
    }

    updateCustomSizeLabels();
    updateSizePreview();

    Object.keys(result).forEach((key) => {
      storageCache.cache[key] = result[key];
      storageCache.setExpiration(key);
    });

    chrome.storage.local.get({ popupShortcut: "default" }, (result) => {
      if (popupShortcutSelect) {
        popupShortcutSelect.value = result.popupShortcut || "default";
      }
    });
  });
}

function saveSettings() {
  const settings = {
    headerModificationEnabled: headerModificationEnabledCheckbox.checked,
    popupSizePreset: popupSizePreset ? popupSizePreset.value : "default",
    customWidth: customWidthSlider ? parseInt(customWidthSlider.value) : 80,
    customHeight: customHeightSlider ? parseInt(customHeightSlider.value) : 80,
    notificationsEnabled: notificationsEnabledCheckbox.checked,
  };

  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      showPageNotification(
        getMessage("settingsSaveFailed") || "Failed to save",
        "error"
      );
    } else {
      showPageNotification(getMessage("settingsSaved") || "Settings saved");

      Object.keys(settings).forEach((key) => {
        storageCache.cache[key] = settings[key];
        storageCache.setExpiration(key);
      });

      const popupShortcut = popupShortcutSelect
        ? popupShortcutSelect.value
        : "default";
      chrome.storage.local.set({ popupShortcut }, () => {
        showPageNotification(getMessage("settingsSaved"), "success");
      });
    }
  });
}

function updateUrlWithActiveTab(tabId) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tabId);
  window.history.replaceState({}, "", url);
}
