# TabBoost - Chrome标签页增强扩展

TabBoost是一款提高浏览器标签页效率的Chrome扩展，它提供了一系列便捷功能，帮助您更高效地管理和使用Chrome标签页。

## 功能特性

- **标签页复制**：快速复制当前标签页
- **链接复制**：一键复制当前网页URL到剪贴板
- **分屏模式**：在单个标签内同时查看两个网页
- **快捷键支持**：所有功能均可通过自定义快捷键快速访问
- **自定义设置**：灵活的配置选项，满足个人使用习惯
- **安全增强**：严格的内容安全策略(CSP)保障扩展安全

## 项目结构

项目采用模块化结构设计，主要目录如下：

```
chrome-tabboost/
├── src/               # 源代码目录
│   ├── assets/        # 静态资源目录
│   │   └── icons/     # 图标文件
│   ├── js/            # JavaScript源文件
│   ├── styles/        # CSS样式文件
│   ├── popup/         # 弹出窗口相关文件
│   ├── options/       # 设置页面相关文件
│   └── utils/         # 工具函数
├── docs/              # 文档目录
├── manifest.json      # 扩展清单文件
└── package.json       # 项目配置文件
```

## 安装方法

1. 从Chrome网上应用店安装：[TabBoost](https://chrome.google.com/webstore/detail/tabboost/...)
2. 或者使用开发者模式加载：
   - 下载并解压本项目代码
   - 在Chrome浏览器地址栏输入 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"按钮
   - 选择本项目根目录

## 使用方法

### 快捷键

- `Ctrl+M` (Mac: `Ctrl+M`): 复制当前标签页
- `Alt+C` (Mac: `Shift+Command+C`): 复制当前网页URL
- `Alt+S` (Mac: `Shift+Command+S`): 切换分屏模式

这些快捷键可以在扩展设置页面中自定义。

### 分屏模式使用

1. 在任意网页按下分屏模式快捷键或通过扩展弹窗启用分屏
2. 左侧显示当前页面，右侧可以通过点击左侧页面的链接进行加载
3. 可以通过拖动中间分隔线调整两个视图的宽度比例

## 安全性

TabBoost采用严格的内容安全策略(CSP)，确保扩展安全可靠：

### 内容安全策略(CSP)

我们在以下方面实施了严格的安全策略：

- **script-src 'self'**: 只允许加载扩展自身域的JavaScript脚本
- **object-src 'none'**: 禁止所有插件内容(如Flash)
- **style-src 'self' 'unsafe-inline'**: 只允许扩展自身域和行内样式表
- **img-src 'self' data: https://*.google.com**: 图片只能从扩展自身、data URLs和Google服务加载
- **connect-src 'self' https://*.google.com**: 网络连接只能到扩展自身或Google服务
- **frame-src 'self'**: 只允许扩展自身的iframe
- **form-action 'none'**: 禁止所有表单提交
- **base-uri 'none'**: 禁止使用BASE标签修改基准URL
- **upgrade-insecure-requests**: 自动将HTTP请求升级为HTTPS

此外，扩展的沙箱页面实施了额外的安全控制，只允许有限的权限。

### URL安全验证

我们还实现了严格的URL验证机制，以防止XSS和其他恶意URL攻击：

- 白名单协议限制：只允许http和https协议
- 黑名单域名检测：阻止已知的敏感和潜在危险域名
- 危险模式检测：识别并阻止包含潜在XSS攻击代码的URL

## 开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/samzong/chrome-tabboost.git
cd chrome-tabboost

# 安装依赖
npm install
```

### 文件说明

- `background.js`: 扩展后台脚本，处理事件监听
- `contentScript.js`: 内容脚本，在网页中注入功能
- `splitView.js`: 分屏模式实现
- `utils.js`: 公共工具函数
- `popup/`: 扩展弹出窗口界面及逻辑
- `options/`: 扩展设置页面及逻辑

## 贡献指南

欢迎对本项目提出改进建议或贡献代码。请通过以下步骤参与：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件
