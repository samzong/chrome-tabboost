// 监听插件图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 获取默认操作
  chrome.storage.sync.get(["defaultAction"], (result) => {
    const defaultAction = result.defaultAction || "open-options"; // 设置默认操作为打开设置页面

    if (defaultAction === "duplicate-tab") {
      duplicateCurrentTab();
    } else if (defaultAction === "copy-url") {
      copyCurrentTabUrl();
    } else if (defaultAction === "open-options") {
      openOptionsPage();
    }
  });
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log("Listener triggered"); // 确认监听器被触发
  console.log("Command received:", command); // 打印接收到的命令
  if (command === "duplicate-tab") {
    duplicateCurrentTab();
  } else if (command === "copy-url") {
    copyCurrentTabUrl();
  }
});

// 定义打开设置页面的函数
async function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

// 复制当前标签页网址
async function copyCurrentTabUrl() {
  let currentTab = await getCurrentTab();
  console.log("Current tab:", currentTab); // 打印当前标签页信息
  if (currentTab) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: (url) => {
          navigator.clipboard
            .writeText(url)
            .then(() => {
              console.log("URL copied to clipboard:", url);
            })
            .catch((err) => {
              console.error("复制失败: ", err);
            });
        },
        args: [currentTab.url],
      });
      console.log("URL copied:", currentTab.url);
      showNotification("网址复制成功!");
    } catch (err) {
      console.error("执行脚本失败: ", err);
      showNotification("网址复制失败!");
    }
  } else {
    console.error("未找到当前标签页");
    showNotification("未找到当前标签页");
  }
}

// 获取当前标签页
async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  console.log("Query result:", tab); // 打印查询结果
  return tab;
}

// 复制当前标签页
async function duplicateCurrentTab() {
  let currentTab = await getCurrentTab();
  if (currentTab) {
    chrome.tabs.duplicate(currentTab.id);
  }
}

// 显示通知
function showNotification(message) {
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "TabBoost",
      message: message,
    },
    function (notificationId) {
      // 0.5秒后清除通知
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 500);
    }
  );
}
