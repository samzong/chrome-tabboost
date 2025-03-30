import { showNotification } from "../utils/utils.js";
import storageCache from "../utils/storage-cache.js"; // 导入storageCache
import { RESTRICTED_DOMAINS } from "../js/splitView/splitViewURLValidator.js"; // 导入系统预设的限制域名
import { localizePage, getMessage } from "../utils/i18n.js"; // 导入国际化工具

// 初始化页面时本地化
document.addEventListener('DOMContentLoaded', () => {
  // 本地化所有标记了data-i18n的元素
  localizePage();
  
  // 处理标记了data-i18n-placeholder的元素
  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(el => {
    const i18nKey = el.getAttribute('data-i18n-placeholder');
    if (i18nKey) {
      const placeholderText = getMessage(i18nKey);
      if (placeholderText) {
        el.setAttribute('placeholder', placeholderText);
      }
    }
  });
  
  // 特殊处理需要动态插入的文本
  updateDynamicLabels();
  
  // 初始化其他功能
  initTabs();
  loadSettings();
  setupEventListeners();
});

// 更新需要动态设置的标签文本
function updateDynamicLabels() {
  // 更新自定义宽度和高度标签（带有动态值）
  updateCustomSizeLabels();
}

// 更新自定义尺寸标签
function updateCustomSizeLabels() {
  const customWidthValue = document.getElementById('customWidthValue').textContent.replace('%', '');
  const customHeightValue = document.getElementById('customHeightValue').textContent.replace('%', '');
  
  const customWidthLabel = document.getElementById('customWidthLabel');
  const customHeightLabel = document.getElementById('customHeightLabel');
  
  if (customWidthLabel) {
    const widthMsg = getMessage("customWidthLabel", [customWidthValue]);
    if (widthMsg) {
      customWidthLabel.textContent = widthMsg;
    } else {
      // 回退处理：如果获取不到本地化消息，则直接使用默认格式
      customWidthLabel.textContent = `自定义宽度: ${customWidthValue}%`;
    }
  }
  
  if (customHeightLabel) {
    const heightMsg = getMessage("customHeightLabel", [customHeightValue]);
    if (heightMsg) {
      customHeightLabel.textContent = heightMsg;
    } else {
      // 回退处理：如果获取不到本地化消息，则直接使用默认格式
      customHeightLabel.textContent = `自定义高度: ${customHeightValue}%`;
    }
  }
}

const saveButton = document.getElementById("saveButton");
const defaultActionInput = document.getElementById("defaultAction");
const splitViewEnabledCheckbox = document.getElementById("splitViewEnabled");
const iframeIgnoreEnabledCheckbox = document.getElementById("iframeIgnoreEnabled");
const autoAddToIgnoreListCheckbox = document.getElementById("autoAddToIgnoreList");
const ignoreListContainer = document.getElementById("ignoreList");
const newDomainInput = document.getElementById("newDomain");
const addDomainButton = document.getElementById("addDomainButton");
const wildCardExample = document.getElementById("wildCardExample");

// 弹窗大小设置相关元素
const popupSizePreset = document.getElementById('popupSizePreset');
const customWidthSlider = document.getElementById('customWidthSlider');
const customHeightSlider = document.getElementById('customHeightSlider');
const customWidthValue = document.getElementById('customWidthValue');
const customHeightValue = document.getElementById('customHeightValue');
const sizePreviewBox = document.getElementById('sizePreviewBox');
const customSizeControls = document.querySelectorAll('.custom-size-controls');

// 标签页切换
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// 处理标签切换
function setupEventListeners() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // 切换标签高亮
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // 切换内容显示
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      document.getElementById(`${tabId}-content`).style.display = 'block';
    });
  });
  
  // 设置自定义宽度和高度滑块的事件监听
  if (customWidthSlider) {
    customWidthSlider.addEventListener('input', function() {
      customWidthValue.textContent = this.value + '%';
      updateCustomSizeLabels();
      updateSizePreview();
    });
  }
  
  if (customHeightSlider) {
    customHeightSlider.addEventListener('input', function() {
      customHeightValue.textContent = this.value + '%';
      updateCustomSizeLabels();
      updateSizePreview();
    });
  }
  
  // 为保存按钮添加点击事件监听器
  saveButton.addEventListener('click', saveSettings);
}

// 更新大小预览
function updateSizePreview() {
  if (sizePreviewBox) {
    const widthValue = customWidthSlider ? customWidthSlider.value : 80;
    const heightValue = customHeightSlider ? customHeightSlider.value : 80;
    
    sizePreviewBox.style.width = widthValue + '%';
    sizePreviewBox.style.height = heightValue + '%';
  }
}

// 初始化标签显示
function initTabs() {
  // 默认显示第一个标签内容（通用设置）
  tabContents.forEach(content => {
    content.style.display = 'none';
  });
  document.getElementById('general-content').style.display = 'block';
  
  // 从URL参数获取要显示的标签
  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get('tab');
  
  if (activeTab) {
    const targetTab = document.querySelector(`.tab[data-tab="${activeTab}"]`);
    if (targetTab) {
      targetTab.click();
    }
  }
}

// 加载设置
function loadSettings() {
  storageCache.get(
    [
      "defaultAction", 
      "splitViewEnabled",
      "iframeIgnoreEnabled",
      "autoAddToIgnoreList",
      "iframeIgnoreList"
    ]
  ).then((result) => {
    defaultActionInput.value = result.defaultAction || "copy-url";
    splitViewEnabledCheckbox.checked = result.splitViewEnabled !== undefined 
      ? result.splitViewEnabled 
      : true; // 默认启用
    iframeIgnoreEnabledCheckbox.checked = result.iframeIgnoreEnabled || false;
    autoAddToIgnoreListCheckbox.checked = result.autoAddToIgnoreList || false;
    
    // 加载忽略列表
    renderIgnoreList(result.iframeIgnoreList || []);
  });
}

// 渲染忽略列表
function renderIgnoreList(ignoreList) {
  // 清空列表
  ignoreListContainer.innerHTML = '';
  
  // 首先添加系统预设的限制域名（无法删除）
  const systemDomains = RESTRICTED_DOMAINS;
  
  // 合并用户忽略列表和系统限制域名
  const combinedList = [...new Set([...ignoreList, ...systemDomains])];
  
  // 如果合并后的列表为空，显示提示信息
  if (!combinedList.length) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'ignore-item-empty';
    emptyItem.textContent = getMessage("noIgnoredWebsites") || '暂无忽略的网站';
    ignoreListContainer.appendChild(emptyItem);
    return;
  }
  
  // 添加系统保留域名列表标题
  if (systemDomains.length > 0) {
    const systemTitle = document.createElement('div');
    systemTitle.className = 'ignore-list-section-title';
    systemTitle.textContent = getMessage("systemReservedDomains") || '系统保留域名（无法删除）';
    ignoreListContainer.appendChild(systemTitle);
    
    // 添加系统保留域名
    systemDomains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'ignore-item system-domain';
      
      const domainText = document.createElement('span');
      domainText.textContent = domain;
      
      // 添加标签指示匹配类型
      const matchTypeBadge = document.createElement('span');
      matchTypeBadge.className = domain.startsWith('*.') ? 'match-type wildcard' : 'match-type exact';
      matchTypeBadge.textContent = domain.startsWith('*.') 
        ? (getMessage("wildcardMatch") || '通配符') 
        : (getMessage("exactMatch") || '精确');
      
      const systemBadge = document.createElement('span');
      systemBadge.className = 'system-badge';
      systemBadge.textContent = getMessage("systemBadge") || '系统';
      
      item.appendChild(domainText);
      item.appendChild(matchTypeBadge);
      item.appendChild(systemBadge);
      
      ignoreListContainer.appendChild(item);
    });
  }
  
  // 添加用户忽略列表中非系统域名
  const userDomains = ignoreList.filter(domain => !systemDomains.includes(domain));
  
  if (userDomains.length > 0) {
    // 添加用户自定义域名
    userDomains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'ignore-item';
      
      const domainText = document.createElement('span');
      domainText.textContent = domain;
      
      // 添加标签指示匹配类型
      const matchTypeBadge = document.createElement('span');
      matchTypeBadge.className = domain.startsWith('*.') ? 'match-type wildcard' : 'match-type exact';
      matchTypeBadge.textContent = domain.startsWith('*.') 
        ? (getMessage("wildcardMatch") || '通配符') 
        : (getMessage("exactMatch") || '精确');
      
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-domain-button';
      removeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      removeButton.addEventListener('click', () => {
        removeDomain(domain);
      });
      
      item.appendChild(domainText);
      item.appendChild(matchTypeBadge);
      item.appendChild(removeButton);
      
      ignoreListContainer.appendChild(item);
    });
  }
}

// 添加域名到忽略列表
function addDomain() {
  const domain = newDomainInput.value.trim();
  
  // 验证域名
  if (!domain) {
    alert('请输入有效的域名');
    return;
  }
  
  // 验证通配符域名格式
  if (domain.startsWith('*.') && domain.split('.').length < 3) {
    alert('通配符域名格式不正确，正确格式为: *.example.com');
    return;
  }
  
  // 检查是否与系统保留域名冲突
  if (RESTRICTED_DOMAINS.some(restrictedDomain => {
    // 如果两个域名完全相同，则冲突
    if (domain === restrictedDomain) return true;
    
    // 如果用户输入的是通配符域名，系统中是非通配符，则检查基础域名
    if (domain.startsWith('*.') && !restrictedDomain.startsWith('*.')) {
      const baseDomain = domain.substring(2);
      return baseDomain === restrictedDomain;
    }
    
    // 如果用户输入的是非通配符，系统中是通配符，则检查基础域名
    if (!domain.startsWith('*.') && restrictedDomain.startsWith('*.')) {
      const systemBaseDomain = restrictedDomain.substring(2);
      return domain === systemBaseDomain || domain.endsWith('.' + systemBaseDomain);
    }
    
    return false;
  })) {
    alert(`"${domain}" 已包含在系统保留域名中，无需重复添加`);
    newDomainInput.value = '';
    return;
  }
  
  // 获取当前忽略列表
  storageCache.get(['iframeIgnoreList']).then((result) => {
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
    storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
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
  storageCache.get(['iframeIgnoreList']).then((result) => {
    let ignoreList = result.iframeIgnoreList || [];
    
    // 确保ignoreList是数组
    if (!Array.isArray(ignoreList)) {
      ignoreList = [];
      return;
    }
    
    // 从列表中移除域名
    ignoreList = ignoreList.filter(item => item !== domain);
    
    // 保存更新后的列表
    storageCache.set({ iframeIgnoreList: ignoreList }).then(() => {
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

// 保存设置
function saveSettings() {
  // 收集所有需要保存的设置
  const settings = {
    defaultAction: defaultActionInput.value,
    splitViewEnabled: splitViewEnabledCheckbox.checked,
    iframeIgnoreEnabled: iframeIgnoreEnabledCheckbox.checked,
    autoAddToIgnoreList: autoAddToIgnoreListCheckbox.checked
  };
  
  // 保存弹窗大小相关设置（如果存在）
  if (popupSizePreset) {
    settings.popupSizePreset = popupSizePreset.value;
    
    // 如果选择了自定义尺寸，保存自定义尺寸值
    if (popupSizePreset.value === 'custom' && customWidthSlider && customHeightSlider) {
      settings.customWidth = parseInt(customWidthSlider.value, 10);
      settings.customHeight = parseInt(customHeightSlider.value, 10);
    }
  }
  
  // 使用存储缓存保存设置
  storageCache.set(settings).then(() => {
    console.log('设置保存成功');
    // 显示保存成功的通知
    showNotification(getMessage("settingsSaved") || '设置已保存');
  }).catch(err => {
    console.error('保存设置失败:', err);
    // 显示保存失败的通知
    showNotification(getMessage("settingsSaveFailed") || '保存设置失败');
  });
}
