const saveButton = document.getElementById("saveButton");
const duplicateTabShortcutInput = document.getElementById(
  "duplicateTabShortcut"
);
const copyUrlShortcutInput = document.getElementById("copyUrlShortcut");
const splitViewShortcutInput = document.getElementById("splitViewShortcut");
const defaultActionInput = document.getElementById("defaultAction");
const splitViewEnabledCheckbox = document.getElementById("splitViewEnabled");
const iframeIgnoreEnabledCheckbox = document.getElementById("iframeIgnoreEnabled");
const autoAddToIgnoreListCheckbox = document.getElementById("autoAddToIgnoreList");
const ignoreListContainer = document.getElementById("ignoreList");
const newDomainInput = document.getElementById("newDomain");
const addDomainButton = document.getElementById("addDomainButton");

// 保存设置
saveButton.addEventListener("click", () => {
  const duplicateTabShortcut = duplicateTabShortcutInput.value;
  const copyUrlShortcut = copyUrlShortcutInput.value;
  const splitViewShortcut = splitViewShortcutInput.value;
  const defaultAction = defaultActionInput.value;
  const splitViewEnabled = splitViewEnabledCheckbox.checked;
  const iframeIgnoreEnabled = iframeIgnoreEnabledCheckbox.checked;
  const autoAddToIgnoreList = autoAddToIgnoreListCheckbox.checked;

  chrome.storage.sync.set(
    {
      duplicateTabShortcut: duplicateTabShortcut,
      copyUrlShortcut: copyUrlShortcut,
      splitViewShortcut: splitViewShortcut,
      defaultAction: defaultAction,
      splitViewEnabled: splitViewEnabled,
      iframeIgnoreEnabled: iframeIgnoreEnabled,
      autoAddToIgnoreList: autoAddToIgnoreList,
    },
    () => {
      alert("设置已保存!");
    }
  );
});

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(
    [
      "duplicateTabShortcut", 
      "copyUrlShortcut", 
      "splitViewShortcut", 
      "defaultAction", 
      "splitViewEnabled",
      "iframeIgnoreEnabled",
      "autoAddToIgnoreList",
      "iframeIgnoreList"
    ],
    (result) => {
      duplicateTabShortcutInput.value = result.duplicateTabShortcut || "Ctrl+M";
      copyUrlShortcutInput.value = result.copyUrlShortcut || "Shift+Ctrl+C";
      splitViewShortcutInput.value = result.splitViewShortcut || "Shift+Command+S";
      defaultActionInput.value = result.defaultAction || "copy-url";
      splitViewEnabledCheckbox.checked = result.splitViewEnabled !== undefined 
        ? result.splitViewEnabled 
        : true; // 默认启用
      iframeIgnoreEnabledCheckbox.checked = result.iframeIgnoreEnabled || false;
      autoAddToIgnoreListCheckbox.checked = result.autoAddToIgnoreList || false;
      
      // 加载忽略列表
      renderIgnoreList(result.iframeIgnoreList || []);
    }
  );
}

// 渲染忽略列表
function renderIgnoreList(ignoreList) {
  // 清空列表
  ignoreListContainer.innerHTML = '';
  
  // 如果列表为空，显示提示信息
  if (!ignoreList.length) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'ignore-item-empty';
    emptyItem.textContent = '暂无忽略的网站';
    ignoreListContainer.appendChild(emptyItem);
    return;
  }
  
  // 添加列表项
  ignoreList.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'ignore-item';
    
    const domainText = document.createElement('span');
    domainText.textContent = domain;
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-btn';
    removeButton.textContent = '删除';
    removeButton.addEventListener('click', () => removeDomain(domain));
    
    item.appendChild(domainText);
    item.appendChild(removeButton);
    ignoreListContainer.appendChild(item);
  });
}

// 添加域名到忽略列表
function addDomain() {
  const domain = newDomainInput.value.trim();
  
  // 验证域名
  if (!domain) {
    alert('请输入有效的域名');
    return;
  }
  
  // 获取当前忽略列表
  chrome.storage.sync.get(['iframeIgnoreList'], (result) => {
    let ignoreList = result.iframeIgnoreList || [];
    
    // 确保ignoreList是数组
    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
    }
    
    // 检查域名是否已在列表中
    if (ignoreList.includes(domain)) {
      alert(`${domain} 已在忽略列表中`);
      return;
    }
    
    // 添加到列表
    ignoreList.push(domain);
    
    // 保存更新后的列表
    chrome.storage.sync.set({ iframeIgnoreList: ignoreList }, () => {
      console.log(`已将 ${domain} 添加到忽略列表`);
      // 清空输入框
      newDomainInput.value = '';
      // 重新渲染列表
      renderIgnoreList(ignoreList);
    });
  });
}

// 从忽略列表中移除域名
function removeDomain(domain) {
  // 获取当前忽略列表
  chrome.storage.sync.get(['iframeIgnoreList'], (result) => {
    let ignoreList = result.iframeIgnoreList || [];
    
    // 确保ignoreList是数组
    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
      return;
    }
    
    // 从列表中移除域名
    ignoreList = ignoreList.filter(item => item !== domain);
    
    // 保存更新后的列表
    chrome.storage.sync.set({ iframeIgnoreList: ignoreList }, () => {
      console.log(`已从忽略列表中移除 ${domain}`);
      // 重新渲染列表
      renderIgnoreList(ignoreList);
    });
  });
}

// 添加域名按钮点击事件
addDomainButton.addEventListener('click', addDomain);

// 域名输入框回车事件
newDomainInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    addDomain();
  }
});

loadSettings();
