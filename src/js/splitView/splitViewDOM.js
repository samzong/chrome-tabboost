// splitViewDOM.js - 处理分屏视图DOM操作

import storageCache from "../../utils/storage-cache.js";
import { canLoadInIframe } from "./splitViewURLValidator.js";

// 确保存储缓存已初始化
async function ensureStorageCacheInit() {
  if (!storageCache.initialized) {
    await storageCache.init(['autoAddToIgnoreList', 'iframeIgnoreList']);
  }
}

// 初始化分屏DOM结构
export function initSplitViewDOM(leftUrl) {
  try {
    // 防止在复杂网站上执行出错，添加额外的安全检查
    if (!document || !document.body) {
      return;
    }
    
    // 针对特定网站的错误进行预处理
    try {
      // 创建缺失元素以防止特定网站的错误
      const dummyMain = document.createElement('div');
      dummyMain.setAttribute('data-md-component', 'main');
      dummyMain.style.display = 'none';
      document.body.appendChild(dummyMain);
    } catch (e) {
    }

    // 清除可能的冲突元素
    const existingSplitView = document.getElementById('tabboost-split-view-container');
    if (existingSplitView) {
      existingSplitView.remove();
    }

    // 处理可能会导致脚本错误的特定网站元素查询
    try {
      // 安全地包装所有可能的DOM查询，避免因特定元素不存在而中断
      const safeQuerySelector = (selector) => {
        try {
          return document.querySelector(selector);
        } catch (e) {
          return null;
        }
      };
      
      // 预防性处理特定网站上已知会导致错误的选择器
      const knownProblematicSelectors = ['[data-md-component=main]'];
      knownProblematicSelectors.forEach(selector => safeQuerySelector(selector));
    } catch (e) {
    }

    // 尝试保存原始内容前进行安全检查
    let originalContent = '';
    try {
      originalContent = document.documentElement.outerHTML || '';
    } catch (e) {
      // 尝试一个更简单的方法
      originalContent = document.body.innerHTML || '';
    }
    
    // 将原始内容安全地保存为数据属性
    try {
      // 避免将过大的内容存储为属性值，可能会导致性能问题
      if (originalContent.length > 500000) { // 限制为约500KB
        // 仅保存关键信息
        originalContent = `<html><head><title>${document.title}</title></head><body><div class="tabboost-restored-content">原始内容太大，无法保存。请刷新页面。</div></body></html>`;
      }
      document.body.setAttribute('data-tabboost-original-content', originalContent);
    } catch (e) {
    }
    
    // 使用单次DOM操作，减少重绘
    const domOperations = () => {
      // 使用DocumentFragment创建完整的DOM结构
      const fragment = document.createDocumentFragment();
      
      // 创建分屏容器
      const splitViewContainer = document.createElement('div');
      splitViewContainer.id = 'tabboost-split-view-container';
      
      // 使用CSS类控制初始不可见状态，而不是直接操作style
      splitViewContainer.classList.add('tabboost-initially-hidden');
      
      // 创建顶部控制栏
      const controlBar = document.createElement('div');
      controlBar.id = 'tabboost-split-controls';
      
      // 关闭按钮
      const closeButton = document.createElement('button');
      closeButton.id = 'tabboost-split-close';
      closeButton.innerText = '关闭分屏';
      closeButton.dataset.action = 'close-split-view';
      
      controlBar.appendChild(closeButton);
      splitViewContainer.appendChild(controlBar);
      
      // 预先创建所有元素再一次性添加，减少DOM操作和重绘
      // 创建分屏内容容器
      const viewsContainer = document.createElement('div');
      viewsContainer.id = 'tabboost-views-container';
      
      // 创建左侧区域
      const leftView = document.createElement('div');
      leftView.id = 'tabboost-split-left';
      
      // 添加左侧关闭按钮
      const leftCloseButton = document.createElement('button');
      leftCloseButton.className = 'tabboost-view-close';
      leftCloseButton.innerText = '×';
      leftCloseButton.title = '关闭左侧内容并保留右侧';
      leftCloseButton.dataset.action = 'close-left-view';
      
      leftView.appendChild(leftCloseButton);
      
      // 创建左侧错误提示
      const leftErrorContainer = document.createElement('div');
      leftErrorContainer.id = 'tabboost-left-error';
      leftErrorContainer.className = 'tabboost-iframe-error';
      leftErrorContainer.innerHTML = `
        <div class="tabboost-error-content">
          <h3>无法在分屏中加载此内容</h3>
          <p>此网站可能不允许在iframe中嵌入显示</p>
          <button class="tabboost-open-in-tab" data-url="${leftUrl}">在新标签页中打开</button>
          <button class="tabboost-add-to-ignore" data-url="${leftUrl}">添加到忽略列表</button>
        </div>
      `;
      leftView.appendChild(leftErrorContainer);
      
      // 创建左侧iframe
      const leftIframe = document.createElement('iframe');
      leftIframe.id = 'tabboost-left-iframe';
      // 设置loading="lazy"属性以延迟加载iframe内容
      leftIframe.setAttribute('loading', 'lazy');
      leftIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
      // 将src设置放在最后，避免过早触发加载
      leftIframe.src = leftUrl;

      // 增强iframe错误处理
      try {
        leftIframe.addEventListener('load', () => {
          try {
            // iframe加载成功，隐藏错误消息
            leftErrorContainer.style.display = 'none';
          } catch (e) {
          }
        });
        
        leftIframe.addEventListener('error', () => {
          try {
            // iframe加载失败，显示错误消息
            leftErrorContainer.style.display = 'flex';
          } catch (e) {
          }
        });
      } catch (e) {
      }

      leftView.appendChild(leftIframe);
      
      // 创建右侧区域
      const rightView = document.createElement('div');
      rightView.id = 'tabboost-split-right';
      
      // 添加右侧关闭按钮
      const rightCloseButton = document.createElement('button');
      rightCloseButton.className = 'tabboost-view-close';
      rightCloseButton.innerText = '×';
      rightCloseButton.title = '关闭右侧内容';
      rightCloseButton.dataset.action = 'close-right-view';
      
      rightView.appendChild(rightCloseButton);
      
      // 创建右侧错误提示
      const rightErrorContainer = document.createElement('div');
      rightErrorContainer.id = 'tabboost-right-error';
      rightErrorContainer.className = 'tabboost-iframe-error';
      rightErrorContainer.innerHTML = `
        <div class="tabboost-error-content">
          <h3>无法在分屏中加载此内容</h3>
          <p>此网站可能不允许在iframe中嵌入显示</p>
          <button class="tabboost-open-in-tab" data-url="">在新标签页中打开</button>
          <button class="tabboost-add-to-ignore" data-url="">添加到忽略列表</button>
        </div>
      `;
      rightView.appendChild(rightErrorContainer);
      
      // 创建右侧iframe
      const rightIframe = document.createElement('iframe');
      rightIframe.id = 'tabboost-right-iframe';
      rightIframe.setAttribute('loading', 'lazy');
      rightIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
      rightIframe.src = 'about:blank';

      // 增强iframe错误处理
      try {
        rightIframe.addEventListener('load', () => {
          try {
            if (rightIframe.src !== 'about:blank') {
              // iframe加载成功，隐藏错误消息
              rightErrorContainer.style.display = 'none';
            }
          } catch (e) {
          }
        });
        
        rightIframe.addEventListener('error', () => {
          try {
            // iframe加载失败，显示错误消息
            rightErrorContainer.style.display = 'flex';
            // 更新按钮的URL
            const openButton = rightErrorContainer.querySelector('.tabboost-open-in-tab');
            if (openButton) {
              openButton.dataset.url = rightIframe.src;
            }
          } catch (e) {
          }
        });
      } catch (e) {
      }

      // 处理iframe无法加载的情况
      rightIframe.onerror = () => {
        rightErrorContainer.style.display = 'flex';
        const openButton = rightErrorContainer.querySelector('.tabboost-open-in-tab');
        if (openButton) {
          openButton.dataset.url = rightIframe.src;
        }
      };

      // 添加超时处理
      setTimeout(() => {
        if (rightIframe.src !== 'about:blank' && 
            (rightIframe.contentDocument === null || rightIframe.contentWindow === null)) {
          // 可能被阻止加载，显示错误信息
          rightErrorContainer.style.display = 'flex';
        }
      }, 5000);

      rightView.appendChild(rightIframe);
      
      // 创建分隔线
      const divider = document.createElement('div');
      divider.id = 'tabboost-split-divider';
      
      // 将分屏视图元素合并到视图容器中
      viewsContainer.appendChild(leftView);
      viewsContainer.appendChild(divider);
      viewsContainer.appendChild(rightView);
      splitViewContainer.appendChild(viewsContainer);
      
      // 将整个分屏容器添加到DocumentFragment
      fragment.appendChild(splitViewContainer);
      
      // 清空页面内容前先保存body引用
      const bodyRef = document.body;
      
      // 防止页面闪烁，先设置body样式
      bodyRef.style.overflow = 'hidden';
      
      // 安全地修改页面DOM
      try {
        // 使用文档片段替换页面内容，而不是清空后再添加
        // 这减少了DOM操作和重绘次数
        while (bodyRef.firstChild) {
          bodyRef.removeChild(bodyRef.firstChild);
        }
        
        // 一次性将整个DocumentFragment添加到页面
        bodyRef.appendChild(fragment);
      } catch (e) {
        // 尝试更保守的方法：隐藏现有内容
        Array.from(bodyRef.children).forEach(child => {
          child.style.display = 'none';
        });
        bodyRef.appendChild(fragment);
      }
      
      // 使用requestAnimationFrame并批量应用样式变更，减少重排和重绘
      requestAnimationFrame(() => {
        // 移除隐藏类以显示分屏视图
        splitViewContainer.classList.remove('tabboost-initially-hidden');
        splitViewContainer.classList.add('tabboost-visible');
      });
    };
    
    // 立即执行DOM操作
    domOperations();
    
    // 使用事件委托，减少事件监听器数量
    document.addEventListener('click', (event) => {
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
            storageCache.get(['iframeIgnoreList']).then(result => {
              let ignoreList = result.iframeIgnoreList || [];
              
              // 确保ignoreList是数组
              if (!Array.isArray(ignoreList)) {
                ignoreList = [];
              }
              
              // 检查域名是否已在列表中
              if (!ignoreList.includes(hostname)) {
                ignoreList.push(hostname);
                
                // 保存更新后的列表
                storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
                  // 显示成功消息
                  alert(`已将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`);
                });
              } else {
                alert(`${hostname} 已在忽略列表中`);
              }
            });
          } catch (error) {
            alert("添加到忽略列表失败");
            
            // 在新标签页中打开
            window.open(url, '_blank');
          }
        }
        return;
      }
    });
  } catch (error) {
    // 尝试恢复原始页面
    try {
      document.body.innerHTML = '<div class="tabboost-error">分屏初始化失败，请刷新页面</div>';
    } catch (e) {
    }
  }
}

// 移除分屏DOM结构，恢复原始内容
export function removeSplitViewDOM() {
  try {
    // 防止在复杂网站上执行出错，添加额外的安全检查
    if (!document || !document.body) {
      return;
    }

    // 获取原始内容
    let originalContent = '';
    try {
      originalContent = document.body.getAttribute('data-tabboost-original-content') || '';
    } catch (e) {
    }

    if (originalContent) {
      // 解析原始内容并恢复
      try {
        const parser = new DOMParser();
        const originalDoc = parser.parseFromString(originalContent, 'text/html');
        
        // 安全地恢复内容
        try {
          document.documentElement.innerHTML = originalDoc.documentElement.innerHTML;
        } catch (e) {
          // 尝试只恢复body内容
          try {
            document.body.innerHTML = originalDoc.body.innerHTML;
          } catch (e2) {
            document.body.innerHTML = '<div class="tabboost-error">无法恢复原始页面，请刷新浏览器</div>';
          }
        }
      } catch (e) {
        // 创建一个简单的恢复按钮
        document.body.innerHTML = `
          <div class="tabboost-error">
            <p>恢复页面失败，请刷新浏览器</p>
            <button onclick="window.location.reload()">刷新页面</button>
          </div>
        `;
      }
    } else {
      // 如果没有保存的原始内容，则提示用户刷新页面
      document.body.innerHTML = `
        <div class="tabboost-error">
          <p>找不到原始页面内容，请刷新浏览器</p>
          <button onclick="window.location.reload()">刷新页面</button>
        </div>
      `;
    }
  } catch (error) {
    // 如果所有恢复尝试都失败，提供一个刷新选项
    try {
      document.body.innerHTML = `
        <div class="tabboost-error">
          <p>恢复页面失败，请刷新浏览器</p>
          <button onclick="window.location.reload()">刷新页面</button>
        </div>
      `;
    } catch (e) {
    }
  }
}

// 更新右侧视图内容
export function updateRightViewDOM(url) {
  try {
    // 防止在复杂网站上执行出错，添加额外的安全检查
    if (!document || !document.body) {
      return;
    }

    // 获取右侧iframe和错误容器
    const rightIframe = document.getElementById('tabboost-right-iframe');
    const rightErrorContainer = document.getElementById('tabboost-right-error');
    
    // 如果找不到iframe，可能是DOM结构有问题
    if (!rightIframe) {
      return;
    }
    
    // 记录加载开始时间，用于检测加载超时
    const loadStartTime = Date.now();
    
    // 标记是否已处理过加载失败
    let hasHandledFailure = false;
    
    // 创建一个函数来处理加载失败
    const handleLoadFailure = (reason) => {
      if (hasHandledFailure) return; // 防止重复处理
      hasHandledFailure = true;
      
      // 显示错误容器
      if (rightErrorContainer) {
        rightErrorContainer.style.display = 'flex';
        
        // 更新按钮的URL
        const openButton = rightErrorContainer.querySelector('.tabboost-open-in-tab');
        if (openButton) {
          openButton.dataset.url = url;
        }
        
        const addToIgnoreButton = rightErrorContainer.querySelector('.tabboost-add-to-ignore');
        if (addToIgnoreButton) {
          addToIgnoreButton.dataset.url = url;
        }
      }
      
      // 检查是否需要自动添加到忽略列表
      storageCache.get(['autoAddToIgnoreList']).then((result) => {
        if (result.autoAddToIgnoreList) {
          try {
            // 添加到忽略列表
            storageCache.get(['iframeIgnoreList']).then((result) => {
              let ignoreList = result.iframeIgnoreList || [];
              
              // 确保ignoreList是数组
              if (!Array.isArray(ignoreList)) {
                ignoreList = [];
              }
              
              // 检查域名是否已在列表中
              const hostname = url.split('/').pop().split('.').slice(-2).join('.');
              if (!ignoreList.includes(hostname)) {
                ignoreList.push(hostname);
                
                // 保存更新后的列表
                storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
                  // 显示通知
                  if (rightErrorContainer) {
                    const autoAddNotice = document.createElement('div');
                    autoAddNotice.className = 'tabboost-auto-add-notice';
                    autoAddNotice.textContent = `已自动将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`;
                    rightErrorContainer.appendChild(autoAddNotice);
                  }
                });
              }
            });
          } catch (error) {
          }
        }
      });
    };
    
    // 更新iframe源
    try {
      // 监听iframe加载错误
      rightIframe.onerror = () => {
        handleLoadFailure('iframe error event');
      };
      
      // 监听iframe加载完成
      rightIframe.onload = () => {
        try {
          // 检查iframe是否真的加载成功
          if (rightIframe.contentDocument === null || rightIframe.contentWindow === null) {
            // 可能是跨域限制或其他问题
            handleLoadFailure('无法访问iframe内容');
            return;
          }
          
          // 检查是否加载了错误页面
          const iframeContent = rightIframe.contentDocument.documentElement.innerHTML || '';
          if (iframeContent.includes('refused to connect') || 
              iframeContent.includes('拒绝连接') ||
              iframeContent.includes('ERR_CONNECTION_REFUSED')) {
            handleLoadFailure('网站拒绝连接');
            return;
          }
          
          // 加载成功，隐藏错误消息
          if (rightErrorContainer) {
            rightErrorContainer.style.display = 'none';
          }
        } catch (e) {
          // 可能是跨域限制导致无法访问iframe内容
          if (rightErrorContainer) {
            rightErrorContainer.style.display = 'none';
          }
        }
      };
      
      // 设置iframe源
      rightIframe.src = url;
    } catch (e) {
      handleLoadFailure('设置iframe源失败');
      
      // 尝试通过location来加载
      try {
        if (rightIframe.contentWindow) {
          rightIframe.contentWindow.location.href = url;
        }
      } catch (navError) {
      }
    }
    
    // 更新错误提示中的URL
    if (rightErrorContainer) {
      try {
        const openButton = rightErrorContainer.querySelector('.tabboost-open-in-tab');
        if (openButton) {
          openButton.dataset.url = url;
        }
        
        const addToIgnoreButton = rightErrorContainer.querySelector('.tabboost-add-to-ignore');
        if (addToIgnoreButton) {
          addToIgnoreButton.dataset.url = url;
        }
      } catch (e) {
      }
    }
    
    // 添加多重检测机制
    // 1. 超时检测 - 如果5秒后仍未加载完成
    setTimeout(() => {
      if (!hasHandledFailure) {
        // 检查iframe是否已加载
        if (rightIframe.contentDocument === null || rightIframe.contentWindow === null) {
          handleLoadFailure('加载超时');
        } else {
          // 检查是否加载了错误页面
          try {
            const iframeContent = rightIframe.contentDocument.documentElement.innerHTML || '';
            if (iframeContent.includes('refused to connect') || 
                iframeContent.includes('拒绝连接') ||
                iframeContent.includes('ERR_CONNECTION_REFUSED')) {
              handleLoadFailure('网站拒绝连接');
            }
          } catch (e) {
          }
        }
      }
    }, 5000);
    
    // 2. 定期检查 - 每秒检查一次，最多检查5次
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      checkCount++;
      
      // 如果已经处理过失败，或者检查次数达到上限，停止检查
      if (hasHandledFailure || checkCount >= 5) {
        clearInterval(checkInterval);
        return;
      }
      
      try {
        // 检查iframe是否已加载
        if (rightIframe.contentDocument === null || rightIframe.contentWindow === null) {
          // 还没加载完，继续等待
          return;
        }
        
        // 检查是否加载了错误页面
        const iframeContent = rightIframe.contentDocument.documentElement.innerHTML || '';
        if (iframeContent.includes('refused to connect') || 
            iframeContent.includes('拒绝连接') ||
            iframeContent.includes('ERR_CONNECTION_REFUSED')) {
          handleLoadFailure('检测到拒绝连接错误');
          clearInterval(checkInterval);
        }
      } catch (e) {
      }
    }, 1000);
  } catch (error) {
    // 如果更新失败，尝试通过background发送消息在新标签页中打开
    try {
      chrome.runtime.sendMessage({
        action: "openInNewTab",
        url: url
      });
    } catch (msgError) {
    }
  }
} 