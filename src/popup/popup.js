// 导入工具函数
import { getCurrentTab, showNotification } from "../utils/utils.js";
// 导入国际化工具
import { localizePage, getMessage } from '../utils/i18n.js';

// 在DOM加载完成后进行本地化
document.addEventListener('DOMContentLoaded', () => {
  // 本地化页面元素
  localizePage();
  
  const duplicateTabButton = document.getElementById("duplicateTabButton");
  const copyUrlButton = document.getElementById("copyUrlButton");
  const openOptionsButton = document.getElementById("openOptionsButton");
  
  duplicateTabButton.addEventListener("click", async () => {
    let currentTab = await getCurrentTab();
    if (currentTab) {
      chrome.tabs.duplicate(currentTab.id);
    }
    window.close(); // 操作完成后关闭 popup
  });
  
  copyUrlButton.addEventListener("click", async () => {
    let currentTab = await getCurrentTab();
    if (currentTab) {
      try {
        await navigator.clipboard.writeText(currentTab.url);
        showNotification(getMessage("urlCopied"));
      } catch (err) {
        console.error("复制失败：", err);
        showNotification(getMessage("urlCopyFailed"));
      }
    }
    window.close(); // 操作完成后关闭 popup
  });
  
  openOptionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
