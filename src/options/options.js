import { showNotification } from "../utils/utils.js";
import storageCache from "../utils/storage-cache.js";
import { localizePage, getMessage } from "../utils/i18n.js";

// 添加页面内通知函数
function showPageNotification(message, type = 'success') {
  // 检查是否已存在通知元素
  let notification = document.getElementById('page-notification');
  
  if (!notification) {
    // 创建通知元素
    notification = document.createElement('div');
    notification.id = 'page-notification';
    notification.className = `page-notification ${type}`;
    document.body.appendChild(notification);
  }
  
  notification.textContent = message;
  notification.className = `page-notification ${type} show`;
  
  // 添加震动效果
  notification.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ],
    {
      duration: 300,
      iterations: 2
    }
  );
  
  // 5秒后自动隐藏
  setTimeout(() => {
    notification.className = notification.className.replace(' show', '');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
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
const defaultActionInput = document.getElementById("defaultAction");
const headerModificationEnabledCheckbox = document.getElementById(
  "headerModificationEnabled"
);

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
      
      // 更新URL以保存当前标签状态
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
      "headerModificationEnabled",
      "popupSizePreset",
      "customWidth",
      "customHeight",
    ])
    .then((result) => {
      defaultActionInput.value = result.defaultAction || "open-options";
      
      // 确保headerModificationEnabled默认为true（开启状态）
      headerModificationEnabledCheckbox.checked = 
        result.headerModificationEnabled !== undefined ? result.headerModificationEnabled : true;

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
    });
}

function saveSettings() {
  const settings = {
    defaultAction: defaultActionInput.value,
    headerModificationEnabled: headerModificationEnabledCheckbox.checked,
    popupSizePreset: popupSizePreset ? popupSizePreset.value : "default",
    customWidth: customWidthSlider ? parseInt(customWidthSlider.value) : 80,
    customHeight: customHeightSlider ? parseInt(customHeightSlider.value) : 80,
  };

  storageCache.set(settings, () => {
    // 使用页面内通知，添加更明显的通知效果
    showPageNotification(getMessage("settingsSaved") || "设置已保存");
    
    // 同时显示系统通知
    showNotification(getMessage("settingsSaved") || "设置已保存");
  });
}

// 添加更新URL的函数
function updateUrlWithActiveTab(tabId) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tabId);
  window.history.replaceState({}, '', url);
}
