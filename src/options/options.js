import { showNotification } from "../utils/utils.js";
import storageCache from "../utils/storage-cache.js";
import { RESTRICTED_DOMAINS } from "../js/splitView/splitViewURLValidator.js";
import { localizePage, getMessage } from "../utils/i18n.js";

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
const defaultActionInput = document.getElementById("defaultAction");
const splitViewEnabledCheckbox = document.getElementById("splitViewEnabled");
const iframeIgnoreEnabledCheckbox = document.getElementById(
  "iframeIgnoreEnabled"
);
const autoAddToIgnoreListCheckbox = document.getElementById(
  "autoAddToIgnoreList"
);
const ignoreListContainer = document.getElementById("ignoreList");
const newDomainInput = document.getElementById("newDomain");
const addDomainButton = document.getElementById("addDomainButton");

const popupSizePreset = document.getElementById("popupSizePreset");
const customWidthSlider = document.getElementById("customWidthSlider");
const customHeightSlider = document.getElementById("customHeightSlider");
const customWidthValue = document.getElementById("customWidthValue");
const customHeightValue = document.getElementById("customHeightValue");
const sizePreviewBox = document.getElementById("sizePreviewBox");

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

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
          width = 80; // Default width
          height = 80; // Default height
        } else if (selectedPreset === "large") {
          width = 95; // Large width
          height = 95; // Large height
        }
        // Update sliders and values (even if hidden)
        if (customWidthSlider) customWidthSlider.value = width;
        if (customHeightSlider) customHeightSlider.value = height;
        if (customWidthValue) customWidthValue.textContent = width + "%";
        if (customHeightValue) customHeightValue.textContent = height + "%";
        updateCustomSizeLabels();
        updateSizePreview(); // Update preview based on preset
      }
    });
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
  storageCache
    .get([
      "defaultAction",
      "splitViewEnabled",
      "iframeIgnoreEnabled",
      "autoAddToIgnoreList",
      "iframeIgnoreList",
      "popupSizePreset",
      "customWidth",
      "customHeight",
    ])
    .then((result) => {
      defaultActionInput.value = result.defaultAction || "copy-url";
      splitViewEnabledCheckbox.checked =
        result.splitViewEnabled !== undefined ? result.splitViewEnabled : true;
      iframeIgnoreEnabledCheckbox.checked = result.iframeIgnoreEnabled || false;
      autoAddToIgnoreListCheckbox.checked = result.autoAddToIgnoreList || false;

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

      renderIgnoreList(result.iframeIgnoreList || []);
    });
}

function renderIgnoreList(ignoreList) {
  ignoreListContainer.innerHTML = "";

  const systemDomains = RESTRICTED_DOMAINS;

  const combinedList = [...new Set([...ignoreList, ...systemDomains])];

  if (!combinedList.length) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "ignore-item-empty";
    emptyItem.textContent = getMessage("noIgnoredWebsites");
    ignoreListContainer.appendChild(emptyItem);
    return;
  }

  if (systemDomains.length > 0) {
    const systemTitle = document.createElement("div");
    systemTitle.className = "ignore-list-section-title";
    systemTitle.textContent = getMessage("systemReservedDomains");
    ignoreListContainer.appendChild(systemTitle);

    systemDomains.forEach((domain) => {
      const item = document.createElement("div");
      item.className = "ignore-item system-domain";

      const domainText = document.createElement("span");
      domainText.textContent = domain;

      const matchTypeBadge = document.createElement("span");
      matchTypeBadge.className = domain.startsWith("*.")
        ? "match-type wildcard"
        : "match-type exact";
      matchTypeBadge.textContent = domain.startsWith("*.")
        ? getMessage("wildcardMatch")
        : getMessage("exactMatch");

      const systemBadge = document.createElement("span");
      systemBadge.className = "system-badge";
      systemBadge.textContent = getMessage("systemBadge");

      item.appendChild(domainText);
      item.appendChild(matchTypeBadge);
      item.appendChild(systemBadge);

      ignoreListContainer.appendChild(item);
    });
  }

  const userDomains = ignoreList.filter(
    (domain) => !systemDomains.includes(domain)
  );

  if (userDomains.length > 0) {
    userDomains.forEach((domain) => {
      const item = document.createElement("div");
      item.className = "ignore-item";

      const domainText = document.createElement("span");
      domainText.textContent = domain;

      const matchTypeBadge = document.createElement("span");
      matchTypeBadge.className = domain.startsWith("*.")
        ? "match-type wildcard"
        : "match-type exact";
      matchTypeBadge.textContent = domain.startsWith("*.")
        ? getMessage("wildcardMatch")
        : getMessage("exactMatch");

      const removeButton = document.createElement("button");
      removeButton.className = "remove-domain-button";
      removeButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      removeButton.title = getMessage("removeFromList") || "Remove from list";
      removeButton.setAttribute(
        "aria-label",
        getMessage("removeFromList") || "Remove from list"
      );
      removeButton.addEventListener("click", () => {
        removeDomain(domain);
      });

      removeButton.addEventListener("mouseover", () => {
        removeButton.classList.add("hover");
      });
      removeButton.addEventListener("mouseout", () => {
        removeButton.classList.remove("hover");
      });

      item.appendChild(domainText);
      item.appendChild(matchTypeBadge);
      item.appendChild(removeButton);

      ignoreListContainer.appendChild(item);
    });
  }
}

function addDomain() {
  const domain = newDomainInput.value.trim();

  if (!domain) {
    showNotification(getMessage("enterValidDomain"), "warning");
    return;
  }

  if (domain.startsWith("*.") && domain.split(".").length < 3) {
    alert(getMessage("invalidWildcardFormat"));
    return;
  }

  if (
    RESTRICTED_DOMAINS.some((restrictedDomain) => {
      if (domain === restrictedDomain) return true;

      if (domain.startsWith("*.") && !restrictedDomain.startsWith("*.")) {
        const baseDomain = domain.substring(2);
        return baseDomain === restrictedDomain;
      }

      if (!domain.startsWith("*.") && restrictedDomain.startsWith("*.")) {
        const systemBaseDomain = restrictedDomain.substring(2);
        return (
          domain === systemBaseDomain || domain.endsWith("." + systemBaseDomain)
        );
      }

      return false;
    })
  ) {
    alert(getMessage("domainInSystemReserved", domain));
    newDomainInput.value = "";
    return;
  }

  storageCache.get(["iframeIgnoreList"]).then((result) => {
    let ignoreList = result.iframeIgnoreList || [];

    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
    }

    if (ignoreList.includes(domain)) {
      alert(getMessage("alreadyInIgnoreList", domain));
      return;
    }

    ignoreList.push(domain);

    storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
      console.log(`"${domain}" has been added to the ignore list`);
      newDomainInput.value = "";
      renderIgnoreList(ignoreList);
    });
  });
}

function removeDomain(domain) {
  storageCache.get(["iframeIgnoreList"]).then((result) => {
    let ignoreList = result.iframeIgnoreList || [];

    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
      return;
    }

    ignoreList = ignoreList.filter((item) => item !== domain);

    storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
      console.log(`"${domain}" has been removed from the ignore list`);
      renderIgnoreList(ignoreList);
    });
  });
}

addDomainButton.addEventListener("click", addDomain);

newDomainInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    addDomain();
  }
});

function saveSettings() {
  const settings = {
    defaultAction: defaultActionInput.value,
    splitViewEnabled: splitViewEnabledCheckbox.checked,
    iframeIgnoreEnabled: iframeIgnoreEnabledCheckbox.checked,
    autoAddToIgnoreList: autoAddToIgnoreListCheckbox.checked,
  };

  if (popupSizePreset) {
    settings.popupSizePreset = popupSizePreset.value;

    if (
      popupSizePreset.value === "custom" &&
      customWidthSlider &&
      customHeightSlider
    ) {
      settings.customWidth = parseInt(customWidthSlider.value, 10);
      settings.customHeight = parseInt(customHeightSlider.value, 10);
    }
  }

  storageCache
    .set(settings)
    .then(() => {
      console.log("Settings saved successfully");
      showNotification(getMessage("settingsSaved"));
    })
    .catch((err) => {
      console.error("Failed to save settings:", err);
      showNotification(getMessage("settingsSaveFailed"));
    });
}
