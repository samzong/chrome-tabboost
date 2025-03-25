// splitViewEvents.js - 处理分屏视图的事件

import storageCache from "../../utils/storageCache.js";

// 处理分屏视图中的事件
export function setupSplitViewEvents() {
  // 使用事件委托，减少事件监听器数量
  document.addEventListener('click', handleSplitViewClick);
}

// 处理分屏视图中的点击事件
function handleSplitViewClick(event) {
  const target = event.target;
  
  // 使用target.closest方法来简化多个按钮的处理
  if (target.closest('#tabboost-split-close, [data-action="close-split-view"]')) {
    chrome.runtime.sendMessage({ action: 'closeSplitView' });
    return;
  }
  
  // 处理左侧关闭按钮
  if (target.closest('.tabboost-view-close[data-action="close-left-view"]')) {
    const rightIframe = document.getElementById('tabboost-right-iframe');
    
    // 检查右侧是否有内容
    if (rightIframe && rightIframe.src && rightIframe.src !== 'about:blank') {
      // 保存右侧URL
      const rightUrl = rightIframe.src;
      
      // 先关闭分屏
      chrome.runtime.sendMessage({ action: 'closeSplitView' });
      
      // 然后在关闭后重新加载右侧内容
      setTimeout(() => {
        window.location.href = rightUrl;
      }, 100);
    } else {
      // 如果右侧没有内容，直接关闭分屏
      chrome.runtime.sendMessage({ action: 'closeSplitView' });
    }
    return;
  }
  
  // 处理右侧关闭按钮
  if (target.closest('.tabboost-view-close[data-action="close-right-view"]')) {
    // 清空右侧内容
    const rightIframe = document.getElementById('tabboost-right-iframe');
    if (rightIframe) {
      rightIframe.src = 'about:blank';
      
      // 隐藏错误提示(如果有)
      const rightError = document.getElementById('tabboost-right-error');
      if (rightError) {
        rightError.style.display = 'none';
      }
      
      // 调整布局 - 扩展左侧到100%
      const leftView = document.getElementById('tabboost-split-left');
      const rightView = document.getElementById('tabboost-split-right');
      const divider = document.getElementById('tabboost-split-divider');
      
      if (leftView && rightView && divider) {
        leftView.style.width = '100%';
        rightView.style.display = 'none';
        divider.style.display = 'none';
      }
    }
    return;
  }
  
  // 处理其他按钮 - 使用更简洁的查找方式
  const openTabButton = target.closest('.tabboost-open-in-tab');
  if (openTabButton) {
    const url = openTabButton.dataset.url;
    if (url) {
      window.open(url, '_blank');
    }
    return;
  }
  
  const addToIgnoreButton = target.closest('.tabboost-add-to-ignore');
  if (addToIgnoreButton) {
    const url = addToIgnoreButton.dataset.url;
    if (url) {
      handleAddToIgnoreList(url);
    }
    return;
  }
}

// 处理添加到忽略列表
async function handleAddToIgnoreList(url) {
  try {
    // 解析URL获取域名
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // 使用storageCache代替直接访问chrome.storage
    chrome.runtime.sendMessage({
      action: 'openInNewTab',
      url: url
    });
    
    // 添加到忽略列表
    const result = await storageCache.get(['iframeIgnoreList']);
    let ignoreList = result.iframeIgnoreList || [];
    
    // 确保ignoreList是数组
    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
    }
    
    // 检查域名是否已在列表中
    if (!ignoreList.includes(hostname)) {
      ignoreList.push(hostname);
      
      // 保存更新后的列表
      await storageCache.set({ iframeIgnoreList: ignoreList });
      console.log(`已将 ${hostname} 添加到忽略列表`);
      // 显示成功消息
      alert(`已将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`);
    } else {
      console.log(`${hostname} 已在忽略列表中`);
      alert(`${hostname} 已在忽略列表中`);
    }
  } catch (error) {
    console.error("添加到忽略列表失败:", error);
    alert("添加到忽略列表失败");
    
    // 在新标签页中打开
    window.open(url, '_blank');
  }
}

// 清理分屏视图的事件监听器
export function cleanupSplitViewEvents() {
  // 移除事件监听器，避免内存泄漏
  document.removeEventListener('click', handleSplitViewClick);
}

// 自动添加到忽略列表
export async function autoAddToIgnoreList(url) {
  try {
    // 获取用户配置
    const result = await storageCache.get(['autoAddToIgnoreList']);
    if (!result.autoAddToIgnoreList) {
      return false; // 如果功能未启用，直接返回
    }
    
    // 解析URL获取域名
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // 获取当前忽略列表
    const listResult = await storageCache.get(['iframeIgnoreList']);
    let ignoreList = listResult.iframeIgnoreList || [];
    
    // 确保ignoreList是数组
    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
    }
    
    // 检查域名是否已在列表中
    if (!ignoreList.includes(hostname)) {
      ignoreList.push(hostname);
      
      // 保存更新后的列表
      await storageCache.set({ iframeIgnoreList: ignoreList });
      console.log(`已自动将 ${hostname} 添加到忽略列表`);
      return true;
    }
    
    return false; // 已在列表中
  } catch (error) {
    console.error("自动添加到忽略列表失败:", error);
    return false;
  }
} 