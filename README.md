# TabBoost - Chrome 标签页增强扩展

<p align="center">
  <img src="src/assets/icons/icon128.png" alt="TabBoost Logo" width="200">
</p>

<p align="center">
  <b>TabBoost 是一款提高浏览器标签页效率的 Chrome 扩展，灵感来源于 Arc Browser。</b>
</p>

<p align="center">
  <img alt="Chrome Web Store Version" src="https://img.shields.io/chrome-web-store/v/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe">
  <img alt="Chrome Web Store Last Updated" src="https://img.shields.io/chrome-web-store/last-updated/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
</p>

TabBoost是一款提高浏览器标签页效率的Chrome扩展，它提供了一系列便捷功能，如链接预览、分屏浏览、标签页复制等，帮助您更高效地管理和使用Chrome标签页，灵感来源于 Arc Browser。

## 功能特性

- **🚀 链接预览**: 无需离开当前页面即可预览链接。按住 `Command` 键 (Mac) 或 `Ctrl` 键 (Windows - 可配置) 点击链接，即可在当前页面的弹出窗口中打开。
- **📺 分屏模式**: 在单个标签页内并排查看两个网页。通过 `Shift + Command + Click` (Mac) 或类似方式 (Windows) 点击链接触发，或通过扩展菜单激活。非常适合比较内容或多任务处理。
- **🧠 智能兼容性处理**: 自动检测无法在预览或分屏中加载的网站（由于 `X-Frame-Options` 或 CSP 限制），并提供在"新标签页中打开"或将其添加到"忽略列表"的选项。可在设置中管理忽略列表。
- **💾 网页保存确认**: 拦截 `Command+S` (Mac) 或 `Ctrl+S` (Windows) 保存快捷键，显示确认对话框，防止意外保存网页而非文件。确认后有3秒时间使用原生保存功能。
- **✨ 标签页复制**: 使用快捷键 (`Ctrl+M` / `MacCtrl+M`) 快速复制当前标签页。
- **🖱️ URL复制**: 使用快捷键 (`Alt+C` / `Shift+Command+C`) 一键复制当前页面URL到剪贴板。
- **🔧 高度自定义**:
    - 配置扩展图标点击的默认操作。
    - 调整预览弹出窗口的大小。
    - 启用/禁用特定功能（如分屏、忽略列表）。
    - 在 `chrome://extensions/shortcuts` 中自定义快捷键。
- **🔒 安全增强**: 严格的内容安全策略(CSP)和URL验证机制保障扩展安全。

## 项目结构

项目采用现代化的前端构建流程，主要结构如下：

```
chrome-tabboost/
├── dist/              # 构建输出目录
├── scripts/           # 辅助脚本 (打包、发布等)
├── src/               # 源代码目录
│   ├── assets/        # 静态资源 (图标等)
│   ├── js/            # JavaScript 源文件 (核心逻辑)
│   ├── options/       # 设置页面
│   ├── popup/         # 扩展弹出窗口
│   ├── styles/        # CSS 样式
│   └── utils/         # 工具函数
├── tests/             # 测试文件
├── manifest.json      # 扩展清单文件
├── package.json       # 项目配置文件
└── webpack.config.js  # Webpack 构建配置文件
```

- `dist/`: 包含打包后的扩展文件，用于加载到浏览器或发布。
- `scripts/`: 包含用于开发、构建、版本管理和发布的辅助 Node.js 脚本。
- `src/`: 包含扩展的所有核心源代码。
- `tests/`: 包含单元测试和集成测试。
- `manifest.json`: 定义扩展的元数据、权限、功能等。
- `package.json`: 定义项目依赖和脚本命令。
- `webpack.config.js`: 配置 Webpack 如何打包和处理项目资源。

## 安装方法

### 正式版（推荐）

从 Chrome 网上应用店安装稳定、经过审核的正式版本：

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)](https://chromewebstore.google.com/detail/tabboost/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)

1. 访问 [Chrome Web Store - TabBoost](https://chromewebstore.google.com/detail/tabboost/pnpabkdhbbjmahfnhnfhpgfmhkkeoloe)
2. 点击"添加至 Chrome"按钮
3. 在弹出的对话框中确认安装

### 开发版

如果您想尝试最新功能或不想通过 Chrome Web Store 安装，可以使用以下方法：

1. **从 GitHub Release 下载：**
   - 访问 [GitHub Releases](https://github.com/samzong/chrome-tabboost/releases) 页面
   - 下载最新版本的 `chrome-tabboost-v*.crx` 文件
   - 将文件拖放到 Chrome 的扩展页面（`chrome://extensions/`）

2. **使用开发者模式加载解压版：**
   - 从 GitHub Release 下载 `chrome-tabboost-v*.zip` 文件并解压
   - 在 Chrome 浏览器地址栏输入 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"按钮
   - 选择解压后的目录

> **注意：** 使用非 Chrome Web Store 的方式安装可能会收到警告提示，这是正常的，因为 Chrome 默认只信任来自商店的扩展。

## 使用方法

### 主要功能

- **链接预览**: 按住 `Command` 键 (Mac) 或 `Ctrl` 键 (Windows) 点击任何链接。
- **分屏模式**: 按住 `Shift + Command` (Mac) 点击任何链接，或通过扩展弹出菜单激活。
- **网页保存确认**: 当您按下 `Command+S` (Mac) 或 `Ctrl+S` (Windows) 时，会拦截原生保存页面功能。

### 默认快捷键

- `Ctrl+M` (Mac: `MacCtrl+M`): 复制当前标签页
- `Alt+C` (Mac: `Shift+Command+C`): 复制当前网页URL

*注意：所有快捷键均可在 Chrome 扩展快捷键设置页面 (`chrome://extensions/shortcuts`) 中自定义。*

### 分屏模式使用

1. 在任意网页按下分屏模式快捷键或通过扩展弹窗启用分屏
2. 左侧显示当前页面，右侧可以通过点击左侧页面的链接进行加载
3. 可以通过拖动中间分隔线调整两个视图的宽度比例

## 安全性

TabBoost采用严格的内容安全策略(CSP)和URL验证机制，确保扩展安全可靠：

### 内容安全策略(CSP)

我们在 `manifest.json` 中定义了严格的安全策略：

- **`extension_pages`**:
    - `script-src 'self'`: 只允许加载扩展自身域的JavaScript脚本。
    - `object-src 'none'`: 禁止所有插件内容(如Flash)。
    - `style-src 'self' 'unsafe-inline'`: 只允许扩展自身域和行内样式表。
    - `img-src 'self' data: https://*.google.com`: 图片只能从扩展自身、data URLs和Google服务加载。
    - `connect-src 'self' https://*.google.com`: 网络连接只能到扩展自身或Google服务。
    - `frame-src 'self'`: 只允许扩展自身的iframe。
    - `form-action 'none'`: 禁止所有表单提交。
    - `base-uri 'none'`: 禁止使用BASE标签修改基准URL。
    - `upgrade-insecure-requests`: 自动将HTTP请求升级为HTTPS。
- **`sandbox`**:
    - `sandbox allow-scripts allow-forms allow-popups allow-modals`: 启用沙箱并允许特定功能。
    - `script-src 'self'`: 沙箱内脚本来源限制。
    - `object-src 'none'`: 沙箱内禁止插件。

### URL安全验证与智能处理

- 内部实现严格的URL验证机制，防止XSS等攻击。
- 智能检测网站是否允许在 iframe 中加载（通过 `X-Frame-Options` 或 CSP）。对于不允许的网站，提供在新标签页打开或添加到忽略列表的选项，以确保功能可用性。

## 自动发布

项目配置了多个 GitHub Actions 工作流程，支持完整的自动化测试和发布流程：

### PR 自动测试

当创建或更新 Pull Request 时，系统会自动：
- 运行所有测试用例
- 验证构建是否成功
- 在 PR 中添加测试结果评论

这确保了所有合并到主分支的代码都经过了充分测试。

### 开发版构建

当新的提交合并到 main 分支时，系统会自动：
- 基于当前版本号和提交哈希生成开发版本号（例如：`2.3.0-dev.a1b2c3d`）
- 构建扩展并打包为 .crx 和 .zip 文件
- 创建标记为"prerelease"的 GitHub Release
- 便于团队成员和测试人员快速获取最新开发版本

### 正式版发布

当创建新的 Git 标签（格式为 `v*`，例如 `v1.0.0`）时，会自动触发以下流程：
- 执行测试与验证
- 构建 .crx 文件和 .zip 文件 
- 创建 GitHub Release 并上传构建文件
- 用户可直接从 GitHub Release 页面下载最新版本

```bash
# 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

### 版本管理

也可以通过 GitHub Actions 界面手动触发工作流，此方式更适合版本管理：
- 选择版本类型（patch/minor/major 等）
- 自动更新版本号、生成更新日志
- 创建 Git 标签并推送
- 构建文件并发布到 GitHub Release

### Chrome Web Store 发布

正式版发布到 Chrome Web Store 需要手动操作：
1. 从 GitHub Release 下载 `.zip` 文件
2. 登录 [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
3. 上传新版本的 `.zip` 文件
4. 完成商店审核流程

### 设置 GitHub Secret

为了使自动构建功能正常工作，需要在 GitHub 仓库中设置以下 Secret：

- `CRX_PRIVATE_KEY`: Chrome 扩展的私钥内容（key.pem 文件内容）

设置步骤：
1. 进入仓库的 Settings > Secrets and variables > Actions
2. 点击 "New repository secret"
3. 添加名为 `CRX_PRIVATE_KEY` 的 secret，值为 key.pem 文件内容

## 开发

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/samzong/chrome-tabboost.git
cd chrome-tabboost

# 安装依赖
npm install

# 运行开发服务器 (带热重载)
npm run dev

# 或者启动开发模式构建
# npm run start

# 构建生产版本
npm run build

# 运行测试
npm test
```

### 版本管理与发布

本项目采用[语义化版本](https://semver.org/lang/zh-CN/)进行版本控制。开发流程建议遵循 Gitflow 或类似模型（如功能分支 -> 开发 -> 合并）。

#### 主要开发命令

- **常用**:
    - `npm run dev`: 启动 Webpack 开发模式 (监听文件变化)。
    - `npm run commit`: 使用 Commitizen 进行规范化提交。
- **构建与测试**:
    - `npm run build`: 执行生产环境构建，输出到 `dist/` 目录。
    - `npm test`: 运行 Jest 测试套件。
    - `npm run test:watch`: 在监听模式下运行测试。
    - `npm run test:coverage`: 运行测试并生成覆盖率报告。
- **版本与发布**:
    - `npm run version:[patch|minor|major]`: 自动更新版本号、生成 `CHANGELOG.md` 并创建 git tag。
    - `npm run changelog`: 手动生成 `CHANGELOG.md`。
    - `npm run release`: 执行验证、构建并打包扩展（生成 `.zip` 文件到 `builds/` 目录）。
    - `npm run publish`: （需要配置）发布到 Chrome Web Store。

#### 发布流程 (示例)

```bash
# 1. 确保在主分支且代码最新
git checkout main
git pull origin main

# 2. 更新版本号 (例如：更新次版本)
npm run version:minor

# 3. 推送更改和标签
git push origin main --tags

# 4. 构建并打包
npm run release

# 5. (手动或自动) 上传 builds/ 目录下的 .zip 文件到 Chrome Web Store
# npm run publish # 如果已配置自动化发布
```

### 文件说明

- `manifest.json`: 扩展的核心配置文件。
- `package.json`: Node.js 项目配置文件，包含依赖和脚本。
- `webpack.config.js`: Webpack 构建配置。
- `scripts/`: 包含各种辅助脚本（版本管理、打包、发布等）。
- `src/js/background.js`: 扩展的后台 Service Worker。
- `src/js/contentScript.js`: 注入到网页中以实现核心功能的脚本。
- `src/popup/`: 扩展弹出窗口的 HTML, CSS, JS 文件。
- `src/options/`: 扩展设置页面的 HTML, CSS, JS 文件。
- `src/utils/`: 包含共享的工具函数模块，如：
    - `i18n.js`: 处理国际化。
    - `iframe-compatibility.js`: 处理 iframe 加载兼容性。
    - `storage-cache.js`: 封装 Chrome Storage API。
    - `utils.js`: 其他通用工具函数。

## 贡献指南

欢迎对本项目提出改进建议或贡献代码。请通过以下步骤参与：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的修改 (`npm run commit` 使用规范化提交)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件
