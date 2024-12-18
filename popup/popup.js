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
      showNotification("网址复制成功!");
    } catch (err) {
      console.error("复制失败: ", err);
      showNotification("网址复制失败!");
    }
  }
  window.close(); // 操作完成后关闭 popup
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// 获取当前标签页，和 background.js 中同名函数功能相同
async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

// 显示通知，和 background.js 中同名函数功能相同
function showNotification(message) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "../icons/icon48.png",
      title: "TabBoost",
      message: message,
    },
    function (notificationId) {
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 500);
    }
  );
}
