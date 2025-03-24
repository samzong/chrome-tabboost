// 导入工具函数
import { getCurrentTab, showNotification } from "../utils/utils.js";

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
      showNotification("网址复制成功！");
    } catch (err) {
      console.error("复制失败：", err);
      showNotification("网址复制失败！");
    }
  }
  window.close(); // 操作完成后关闭 popup
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
