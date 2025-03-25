// 获取当前标签页
export async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  console.log("Query result:", tab); // 打印查询结果
  return tab;
}

// 显示通知
export function showNotification(message) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icons/icon48.png"), // 使用chrome.runtime.getURL获取正确路径
      title: "TabBoost",
      message: message,
    },
    function (notificationId) {
      // 0.5 秒后清除通知
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 500);
    }
  );
}
