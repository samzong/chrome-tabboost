// splitViewDOM.js - 处理分屏视图DOM操作

import storageCache from "../../utils/storageCache.js";
import { canLoadInIframe } from "./splitViewURLValidator.js";

// 初始化分屏DOM结构
export function initSplitViewDOM(leftUrl) {
  try {
    // 防止在复杂网站上执行出错，添加额外的安全检查
    if (!document || !document.body) {
      console.error("无法访问文档或文档主体");
      return;
    }
    
    // 针对特定网站的错误进行预处理
    try {
      // 创建缺失元素以防止特定网站的错误
      const dummyMain = document.createElement('div');
      dummyMain.setAttribute('data-md-component', 'main');
      dummyMain.style.display = 'none';
      document.body.appendChild(dummyMain);
      
      console.log("添加了虚拟元素以防止特定网站错误");
    } catch (e) {
      console.warn("添加虚拟元素失败:", e);
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
          console.warn(`查询元素 ${selector} 失败:`, e);
          return null;
        }
      };
      
      // 预防性处理特定网站上已知会导致错误的选择器
      const knownProblematicSelectors = ['[data-md-component=main]'];
      knownProblematicSelectors.forEach(selector => safeQuerySelector(selector));
    } catch (e) {
      console.warn("预处理特定网站元素时出错:", e);
      // 继续执行，不中断主要功能
    }

    // 尝试保存原始内容前进行安全检查
    let originalContent = '';
    try {
      originalContent = document.documentElement.outerHTML || '';
    } catch (e) {
      console.warn("无法完全保存原始内容:", e);
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
      console.warn("无法保存原始内容:", e);
    }
    
    // 使用单次DOM操作，减少重绘
    const domOperations = () => {
      // 使用DocumentFragment创建完整的DOM结构
      const fragment = document.createDocumentFragment();
      
      // 创建分屏容器
      const splitViewContainer = document.createElement('div');
      splitViewContainer.id = 'tabboost-split-view-container';
      
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
      leftIframe.src = leftUrl;
      leftIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
      leftIframe.setAttribute('loading', 'lazy');

      // 增强iframe错误处理
      try {
        leftIframe.addEventListener('load', () => {
          try {
            // iframe加载成功，隐藏错误消息
            leftErrorContainer.style.display = 'none';
          } catch (e) {
            console.warn("处理左侧iframe加载事件失败:", e);
          }
        });
        
        leftIframe.addEventListener('error', () => {
          try {
            // iframe加载失败，显示错误消息
            leftErrorContainer.style.display = 'flex';
          } catch (e) {
            console.warn("处理左侧iframe错误事件失败:", e);
          }
        });
      } catch (e) {
        console.warn("添加左侧iframe事件监听器失败:", e);
      }

      // 处理iframe无法加载的情况
      leftIframe.onerror = () => {
        leftErrorContainer.style.display = 'flex';
      };

      // 添加超时处理，防止iframe永久加载
      setTimeout(() => {
        if (leftIframe.contentDocument === null || leftIframe.contentWindow === null) {
          // 可能被阻止加载，显示错误信息
          leftErrorContainer.style.display = 'flex';
        }
      }, 5000);

      leftView.appendChild(leftIframe);
      splitViewContainer.appendChild(leftView);
      
      // 创建分隔线
      const divider = document.createElement('div');
      divider.id = 'tabboost-split-divider';
      splitViewContainer.appendChild(divider);
      
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
      rightIframe.src = 'about:blank';
      rightIframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-forms');
      rightIframe.setAttribute('loading', 'lazy');

      // 增强iframe错误处理
      try {
        rightIframe.addEventListener('load', () => {
          try {
            if (rightIframe.src !== 'about:blank') {
              // iframe加载成功，隐藏错误消息
              rightErrorContainer.style.display = 'none';
            }
          } catch (e) {
            console.warn("处理右侧iframe加载事件失败:", e);
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
            console.warn("处理右侧iframe错误事件失败:", e);
          }
        });
      } catch (e) {
        console.warn("添加右侧iframe事件监听器失败:", e);
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
      splitViewContainer.appendChild(rightView);
      
      // 将整个分屏容器添加到DocumentFragment
      fragment.appendChild(splitViewContainer);
      
      // 先隐藏，避免引起闪烁
      splitViewContainer.style.opacity = '0';
      
      // 清空页面内容前先保存body引用
      const bodyRef = document.body;
      
      // 安全地修改页面DOM
      try {
        // 尝试清空页面内容
        bodyRef.innerHTML = '';
      } catch (e) {
        console.warn("无法完全清空页面内容:", e);
        // 尝试更保守的方法：隐藏现有内容
        Array.from(bodyRef.children).forEach(child => {
          child.style.display = 'none';
        });
      }
      
      // 一次性将整个DocumentFragment添加到页面
      bodyRef.appendChild(fragment);
      
      // 使用requestAnimationFrame来确保在下一帧渲染前应用样式
      requestAnimationFrame(() => {
        // 在下一帧应用淡入效果
        splitViewContainer.style.transition = 'opacity 0.3s';
        splitViewContainer.style.opacity = '1';
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
                  console.log(`已将 ${hostname} 添加到忽略列表`);
                  // 显示成功消息
                  alert(`已将 ${hostname} 添加到忽略列表，下次将直接在新标签页中打开`);
                });
              } else {
                console.log(`${hostname} 已在忽略列表中`);
                alert(`${hostname} 已在忽略列表中`);
              }
            });
          } catch (error) {
            console.error("添加到忽略列表失败:", error);
            alert("添加到忽略列表失败");
            
            // 在新标签页中打开
            window.open(url, '_blank');
          }
        }
        return;
      }
    });
    
    console.log("分屏DOM结构成功添加到页面");
  } catch (error) {
    console.error("初始化分屏DOM结构失败:", error);
    // 尝试恢复原始页面
    try {
      document.body.innerHTML = '<div class="tabboost-error">分屏初始化失败，请刷新页面</div>';
    } catch (e) {
      // 如果连恢复都失败，不做进一步处理
      console.error("无法显示错误信息:", e);
    }
  }
}

// 移除分屏DOM结构，恢复原始内容
export function removeSplitViewDOM() {
  try {
    // 防止在复杂网站上执行出错，添加额外的安全检查
    if (!document || !document.body) {
      console.error("无法访问文档或文档主体");
      return;
    }

    // 获取原始内容
    let originalContent = '';
    try {
      originalContent = document.body.getAttribute('data-tabboost-original-content') || '';
    } catch (e) {
      console.warn("获取原始内容失败:", e);
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
          console.warn("无法完全恢复原始内容，尝试替代方案:", e);
          
          // 尝试只恢复body内容
          try {
            document.body.innerHTML = originalDoc.body.innerHTML;
          } catch (e2) {
            console.error("无法恢复页面内容:", e2);
            document.body.innerHTML = '<div class="tabboost-error">无法恢复原始页面，请刷新浏览器</div>';
          }
        }
      } catch (e) {
        console.error("解析原始内容失败:", e);
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
    console.error("移除分屏DOM结构失败:", error);
    // 如果所有恢复尝试都失败，提供一个刷新选项
    try {
      document.body.innerHTML = `
        <div class="tabboost-error">
          <p>恢复页面失败，请刷新浏览器</p>
          <button onclick="window.location.reload()">刷新页面</button>
        </div>
      `;
    } catch (e) {
      // 如果连错误提示都无法显示，最后尝试alert
      try {
        alert("页面恢复失败，请刷新浏览器");
      } catch (finalError) {
        // 实在没办法了，什么都不做
      }
    }
  }
}

// 更新右侧视图内容
export function updateRightViewDOM(url) {
  try {
    // 防止在复杂网站上执行出错，添加额外的安全检查
    if (!document || !document.body) {
      console.error("无法访问文档或文档主体");
      return;
    }

    // 获取右侧iframe和错误容器
    const rightIframe = document.getElementById('tabboost-right-iframe');
    const rightErrorContainer = document.getElementById('tabboost-right-error');
    
    // 如果找不到iframe，可能是DOM结构有问题
    if (!rightIframe) {
      console.error("找不到右侧iframe元素");
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
      
      console.log(`右侧iframe加载失败: ${reason}`);
      
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
      chrome.storage.sync.get(['autoAddToIgnoreList'], (result) => {
        if (result.autoAddToIgnoreList) {
          try {
            // 解析URL获取域名
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // 添加到忽略列表
            chrome.storage.sync.get(['iframeIgnoreList'], (result) => {
              let ignoreList = result.iframeIgnoreList || [];
              
              // 确保ignoreList是数组
              if (!Array.isArray(ignoreList)) {
                ignoreList = [];
              }
              
              // 检查域名是否已在列表中
              if (!ignoreList.includes(hostname)) {
                ignoreList.push(hostname);
                
                // 保存更新后的列表
                chrome.storage.sync.set({ iframeIgnoreList: ignoreList }, () => {
                  console.log(`已自动将 ${hostname} 添加到忽略列表`);
                  
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
            console.error("自动添加到忽略列表失败:", error);
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
          console.warn("处理右侧iframe加载事件失败:", e);
          
          // 如果是跨域错误，我们假设加载成功了
          // 因为跨域限制只是阻止我们访问内容，但iframe可能已经正确加载
          if (rightErrorContainer) {
            rightErrorContainer.style.display = 'none';
          }
        }
      };
      
      // 设置iframe源
      rightIframe.src = url;
      console.log("已更新右侧iframe源:", url);
    } catch (e) {
      console.error("设置iframe src失败:", e);
      handleLoadFailure('设置iframe源失败');
      
      // 尝试通过location来加载
      try {
        if (rightIframe.contentWindow) {
          rightIframe.contentWindow.location.href = url;
        }
      } catch (navError) {
        console.error("导航到URL失败:", navError);
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
        console.warn("更新错误提示按钮失败:", e);
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
            // 忽略跨域错误
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
        // 忽略跨域错误
      }
    }, 1000);
  } catch (error) {
    console.error("更新右侧视图内容失败:", error);
    
    // 如果更新失败，尝试通过background发送消息在新标签页中打开
    try {
      chrome.runtime.sendMessage({
        action: "openInNewTab",
        url: url
      });
    } catch (msgError) {
      console.error("发送消息失败:", msgError);
    }
  }
} 