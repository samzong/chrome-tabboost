// splitView.js - 实现分屏模式功能

import { getCurrentTab } from "./utils.js";

// 保存分屏状态的变量
let isSplitViewActive = false;
let leftUrl = "";
let rightUrl = "";

// 创建分屏视图
export async function createSplitView() {
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("无法获取当前标签页");
      return;
    }

    // 获取当前URL作为左侧初始URL
    leftUrl = currentTab.url;

    // 确保URL可用
    if (!leftUrl || leftUrl === 'about:blank') {
      console.error("无效的页面URL");
      return;
    }

    // 将当前页面转换为分屏模式
    try {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: initSplitViewDOM,
        args: [leftUrl]
      });
      
      isSplitViewActive = true;
      console.log("分屏模式已激活");
    } catch (e) {
      console.error("执行分屏视图脚本失败:", e);
      // 尝试重试一次
      setTimeout(() => {
        try {
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            function: initSplitViewDOM,
            args: [leftUrl]
          });
          
          isSplitViewActive = true;
          console.log("分屏模式已通过重试激活");
        } catch (retryError) {
          console.error("重试执行分屏视图脚本失败:", retryError);
        }
      }, 500);
    }
  } catch (error) {
    console.error("创建分屏视图失败:", error);
  }
}

// 关闭分屏视图
export async function closeSplitView() {
  if (!isSplitViewActive) return;
  
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("无法获取当前标签页");
      return;
    }

    // 恢复左侧内容为主界面
    try {
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: removeSplitViewDOM
      });
      
      isSplitViewActive = false;
      console.log("分屏模式已关闭");
    } catch (e) {
      console.error("执行恢复页面脚本失败:", e);
      
      // 尝试重新加载页面作为恢复的备选方案
      try {
        chrome.tabs.reload(currentTab.id);
        isSplitViewActive = false;
        console.log("通过页面重载关闭分屏模式");
      } catch (reloadError) {
        console.error("重载页面失败:", reloadError);
      }
    }
  } catch (error) {
    console.error("关闭分屏视图失败:", error);
  }
}

// 切换分屏视图
export async function toggleSplitView() {
  if (isSplitViewActive) {
    await closeSplitView();
  } else {
    await createSplitView();
  }
}

// 更新分屏右侧内容
export async function updateRightView(url) {
  if (!isSplitViewActive) return;
  
  rightUrl = url;
  try {
    const currentTab = await getCurrentTab();
    if (!currentTab) {
      console.error("无法获取当前标签页");
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: updateRightViewDOM,
      args: [url]
    });
  } catch (error) {
    console.error("更新右侧视图失败:", error);
  }
}

// 检查是否可以在iframe中加载URL
export function canLoadInIframe(url) {
  try {
    // 已知不允许在iframe中加载的网站列表
    const restrictedDomains = [
      'accounts.google.com', 
      'mail.google.com', 
      'www.youtube.com',
      'youtube.com',
      'github.com',
      'facebook.com',
      'twitter.com',
      'x.com',
      'linkedin.com',
      'instagram.com',
      'netflix.com',
      'amazon.com',
      'apple.com',
      'microsoft.com',
      'login',   // 包含login的域名通常不允许iframe加载
      'signin',  // 包含signin的域名通常不允许iframe加载
      'auth',    // 包含auth的域名通常不允许iframe加载
      'account'  // 包含account的域名通常不允许iframe加载
    ];
    
    // 检查URL是否有效
    if (!url || url === 'about:blank') {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      
      // 检查URL协议
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }
      
      // 检查是否在限制列表中
      return !restrictedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch (e) {
      console.warn("URL解析错误:", e);
      return false; // URL无效，不尝试加载
    }
  } catch (error) {
    console.error("canLoadInIframe函数执行错误:", error);
    return false; // 出错时不尝试加载
  }
}

// 初始化分屏DOM结构
function initSplitViewDOM(leftUrl) {
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
      document.body.setAttribute('data-tabboost-original-content', originalContent);
    } catch (e) {
      console.warn("无法保存原始内容:", e);
    }
    
    // 创建分屏容器
    const splitViewContainer = document.createElement('div');
    splitViewContainer.id = 'tabboost-split-view-container';
    
    // 创建左侧区域
    const leftView = document.createElement('div');
    leftView.id = 'tabboost-split-left';
    
    // 添加左侧关闭按钮
    const leftCloseButton = document.createElement('button');
    leftCloseButton.className = 'tabboost-view-close';
    leftCloseButton.innerText = '×';
    leftCloseButton.title = '关闭左侧内容并保留右侧';
    leftCloseButton.addEventListener('click', () => {
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
    });
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
    
    // 创建右侧区域
    const rightView = document.createElement('div');
    rightView.id = 'tabboost-split-right';
    
    // 添加右侧关闭按钮
    const rightCloseButton = document.createElement('button');
    rightCloseButton.className = 'tabboost-view-close';
    rightCloseButton.innerText = '×';
    rightCloseButton.title = '关闭右侧内容';
    rightCloseButton.addEventListener('click', () => {
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
    });
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
    
    // 创建分隔线
    const divider = document.createElement('div');
    divider.id = 'tabboost-split-divider';
    
    // 创建顶部控制栏
    const controlBar = document.createElement('div');
    controlBar.id = 'tabboost-split-controls';
    
    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.id = 'tabboost-split-close';
    closeButton.innerText = '关闭分屏';
    closeButton.addEventListener('click', () => {
      // 发送消息到background.js关闭分屏
      chrome.runtime.sendMessage({ action: 'closeSplitView' });
    });
    
    controlBar.appendChild(closeButton);
    
    // 组装DOM结构
    splitViewContainer.appendChild(controlBar);
    splitViewContainer.appendChild(leftView);
    splitViewContainer.appendChild(divider);
    splitViewContainer.appendChild(rightView);
    
    // 安全地修改页面DOM
    try {
      // 清空页面内容前先保存body引用
      const bodyRef = document.body;
      
      // 尝试清空页面内容
      try {
        bodyRef.innerHTML = '';
      } catch (e) {
        console.warn("无法完全清空页面内容:", e);
        // 尝试更保守的方法：隐藏现有内容
        Array.from(bodyRef.children).forEach(child => {
          child.style.display = 'none';
        });
      }
      
      // 添加分屏容器
      bodyRef.appendChild(splitViewContainer);
      
      console.log("分屏DOM结构成功添加到页面");
    } catch (e) {
      console.error("无法修改页面DOM:", e);
      throw e; // 重新抛出错误以便外部捕获
    }
    
    // 等待DOM完全渲染后
    setTimeout(() => {
      try {
        // 移除拖动分隔线功能的相关代码
        console.log("分屏模式已初始化");
      } catch (e) {
        console.error("分屏模式初始化后处理失败:", e);
      }
    }, 100);
    
    // 添加在新标签页中打开按钮的事件监听
    try {
      document.querySelectorAll('.tabboost-open-in-tab').forEach(button => {
        button.addEventListener('click', (e) => {
          const url = e.target.dataset.url;
          if (url) {
            window.open(url, '_blank');
          }
        });
      });
    } catch (e) {
      console.warn("无法添加打开新标签页按钮事件:", e);
    }
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
function removeSplitViewDOM() {
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
function updateRightViewDOM(url) {
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
    
    // 更新iframe源
    try {
      rightIframe.src = url;
      console.log("已更新右侧iframe源:", url);
    } catch (e) {
      console.error("设置iframe src失败:", e);
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
      } catch (e) {
        console.warn("更新错误提示按钮失败:", e);
      }
    }
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