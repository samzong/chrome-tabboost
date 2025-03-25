// splitViewEvents.js - 处理分屏视图的事件

import storageCache from "../../utils/storageCache.js";

// 存储拖动状态
let isDragging = false;
let startX = 0;
let startY = 0;
let leftWidth = 50; // 左侧宽度百分比

// 处理分屏视图中的事件
export function setupSplitViewEvents() {
  // 使用事件委托，减少事件监听器数量
  document.addEventListener('click', handleSplitViewClick);
  
  // 设置分隔线拖动事件
  setupDividerDrag();
}

// 优化的分隔线拖动事件处理
function setupDividerDrag() {
  const divider = document.getElementById('tabboost-split-divider');
  if (!divider) return;
  
  // 添加拖动事件监听器
  divider.addEventListener('mousedown', startDrag);
  
  // 使用被动事件监听器提高性能
  document.addEventListener('mousemove', onDrag, { passive: true });
  document.addEventListener('mouseup', stopDrag);
  
  // 触摸设备支持
  divider.addEventListener('touchstart', startDragTouch, { passive: true });
  document.addEventListener('touchmove', onDragTouch, { passive: true });
  document.addEventListener('touchend', stopDrag);
}

// 开始拖动 - 鼠标
function startDrag(e) {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  
  // 获取当前左侧宽度
  const leftView = document.getElementById('tabboost-split-left');
  if (leftView) {
    const computedStyle = window.getComputedStyle(leftView);
    leftWidth = parseFloat(computedStyle.width) / window.innerWidth * 100;
  }
  
  // 添加拖动指示类
  document.body.classList.add('tabboost-dragging');
  
  // 防止文本选择
  e.preventDefault();
}

// 开始拖动 - 触摸
function startDragTouch(e) {
  if (e.touches.length !== 1) return;
  
  isDragging = true;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  
  // 获取当前左侧宽度
  const leftView = document.getElementById('tabboost-split-left');
  if (leftView) {
    const computedStyle = window.getComputedStyle(leftView);
    leftWidth = parseFloat(computedStyle.width) / window.innerWidth * 100;
  }
  
  // 添加拖动指示类
  document.body.classList.add('tabboost-dragging');
}

// 拖动中 - 鼠标
function onDrag(e) {
  if (!isDragging) return;
  
  // 使用requestAnimationFrame优化性能
  requestAnimationFrame(() => {
    updateSplitPosition(e.clientX, e.clientY);
  });
}

// 拖动中 - 触摸
function onDragTouch(e) {
  if (!isDragging || e.touches.length !== 1) return;
  
  // 使用requestAnimationFrame优化性能
  requestAnimationFrame(() => {
    updateSplitPosition(e.touches[0].clientX, e.touches[0].clientY);
  });
}

// 更新分屏位置
function updateSplitPosition(clientX, clientY) {
  const container = document.getElementById('tabboost-views-container');
  const leftView = document.getElementById('tabboost-split-left');
  const rightView = document.getElementById('tabboost-split-right');
  
  if (!container || !leftView || !rightView) return;
  
  // 检查是否为横向或纵向分屏
  const isHorizontalSplit = window.innerWidth > 768;
  
  if (isHorizontalSplit) {
    // 计算鼠标移动距离转换为百分比
    const deltaX = clientX - startX;
    const containerWidth = container.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    // 计算新的左侧宽度百分比
    let newLeftWidth = leftWidth + deltaPercent;
    
    // 限制拖动范围
    newLeftWidth = Math.max(20, Math.min(80, newLeftWidth));
    
    // 使用CSS变量更新分屏比例，减少重排重绘
    container.style.setProperty('--left-width', `${newLeftWidth}%`);
    container.style.setProperty('--right-width', `${100 - newLeftWidth}%`);
    
    // 更新宽度（利用CSS变量）
    leftView.style.width = 'var(--left-width)';
    rightView.style.width = 'var(--right-width)';
  } else {
    // 纵向分屏逻辑（移动设备）
    const deltaY = clientY - startY;
    const containerHeight = container.offsetHeight;
    const deltaPercent = (deltaY / containerHeight) * 100;
    
    // 计算新的左侧（此时是上方）高度百分比
    let newTopHeight = leftWidth + deltaPercent;
    
    // 限制拖动范围
    newTopHeight = Math.max(20, Math.min(80, newTopHeight));
    
    // 使用CSS变量更新分屏比例
    container.style.setProperty('--top-height', `${newTopHeight}%`);
    container.style.setProperty('--bottom-height', `${100 - newTopHeight}%`);
    
    // 更新高度（利用CSS变量）
    leftView.style.height = 'var(--top-height)';
    rightView.style.height = 'var(--bottom-height)';
  }
}

// 停止拖动
function stopDrag() {
  if (!isDragging) return;
  
  isDragging = false;
  
  // 移除拖动指示类
  document.body.classList.remove('tabboost-dragging');
  
  // 保存分屏比例设置
  const leftView = document.getElementById('tabboost-split-left');
  if (leftView) {
    const computedStyle = window.getComputedStyle(leftView);
    const isHorizontalSplit = window.innerWidth > 768;
    
    if (isHorizontalSplit) {
      const width = parseFloat(computedStyle.width) / window.innerWidth * 100;
      storageCache.set({ 'splitViewHorizontalRatio': width });
    } else {
      const height = parseFloat(computedStyle.height) / window.innerHeight * 100;
      storageCache.set({ 'splitViewVerticalRatio': height });
    }
  }
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
  
  const divider = document.getElementById('tabboost-split-divider');
  if (divider) {
    divider.removeEventListener('mousedown', startDrag);
    divider.removeEventListener('touchstart', startDragTouch);
  }
  
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', onDragTouch);
  document.removeEventListener('touchend', stopDrag);
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