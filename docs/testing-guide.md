# TabBoost 测试指南

本文档提供了TabBoost Chrome扩展的测试框架介绍、测试编写指南和最佳实践。

## 目录

1. [测试架构](#测试架构)
2. [运行测试](#运行测试)
3. [编写测试](#编写测试)
4. [模拟Chrome API](#模拟Chrome-API)
5. [测试覆盖率](#测试覆盖率)
6. [持续集成](#持续集成)
7. [测试最佳实践](#测试最佳实践)

## 测试架构

TabBoost使用以下工具进行测试：

- **Jest**: 主要测试框架
- **jest-chrome**: 模拟Chrome API的库
- **@testing-library/dom**: DOM测试工具

测试文件组织结构：

```
tests/
├── mocks/            # 模拟文件
│   ├── fileMock.js
│   └── styleMock.js
├── setup.js          # Jest全局设置
├── unit/             # 单元测试
└── integration/      # 集成测试
```

## 运行测试

可以使用以下命令运行测试：

```bash
# 运行所有测试
npm test

# 观察模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# CI环境测试
npm run test:ci
```

## 编写测试

### 单元测试

单元测试应该专注于测试单个函数或模块的行为，不涉及外部依赖。例如：

```javascript
import { validateUrl } from '../../src/utils/utils';

describe('validateUrl函数', () => {
  test('应该验证合法的HTTP URL', () => {
    const url = 'http://example.com';
    const result = validateUrl(url);
    expect(result.isValid).toBe(true);
  });
  
  test('应该拒绝JavaScript协议URL', () => {
    const url = 'javascript:alert(1)';
    const result = validateUrl(url);
    expect(result.isValid).toBe(false);
  });
});
```

### 集成测试

集成测试应该测试多个组件或模块之间的交互：

```javascript
import splitViewCore from '../../src/js/splitView/splitViewCore';

describe('分屏视图集成测试', () => {
  test('切换分屏视图流程', async () => {
    await splitViewCore.toggleSplitView();
    // 验证预期行为...
  });
});
```

## 模拟Chrome API

使用`jest-chrome`模拟Chrome API：

```javascript
// 在测试文件中
beforeEach(() => {
  chrome.storage.sync.get.mockImplementation((keys, callback) => {
    const result = { key: 'value' };
    callback(result);
  });
});

test('应该从存储中获取值', async () => {
});
```

常用的模拟模式：

```javascript
chrome.tabs.query.mockImplementation((queryInfo, callback) => {
  callback([{ id: 123, url: 'https://example.com' }]);
});

chrome.runtime.sendMessage.mockImplementation((message, callback) => {
  callback({ success: true });
});

// 模拟事件监听器
chrome.tabs.onActivated.addListener(listener);
chrome.tabs.onActivated.callListeners({ tabId: 123 });
```

## 测试覆盖率

运行`npm run test:coverage`后，可以在`coverage/`目录中查看覆盖率报告。我们的目标覆盖率是：

- 语句覆盖率：≥ 60%
- 分支覆盖率：≥ 50%
- 函数覆盖率：≥ 60%
- 行覆盖率：≥ 60%

## 持续集成

项目使用GitHub Actions进行持续集成，每次推送到main或develop分支以及创建PR时，都会自动运行测试。配置文件位于`.github/workflows/tests.yml`。

CI流程包括：

1. 运行Lint检查
2. 运行单元测试和集成测试
3. 生成覆盖率报告
4. 构建扩展并验证

## 测试最佳实践

1. **测试隔离**: 每个测试应该是独立的，不依赖于其他测试的状态。

2. **模拟外部依赖**: 使用jest.mock()模拟所有外部依赖，如Chrome API和第三方服务。

3. **可读性**: 测试描述应清晰表明测试的内容和预期结果。使用描述性的test和describe块。

4. **边界条件**: 测试函数的边界条件，包括无效输入、空值和异常情况。

5. **代码组织**: 将测试辅助函数提取到共享文件中，减少重复代码。

6. **异步测试**: 对于Promise和异步函数，使用async/await语法使测试更易读。

7. **测试覆盖率**: 定期检查覆盖率报告，找出未测试的代码路径。

8. **重构友好**: 编写测试时关注行为而非实现细节，使测试在重构时仍然有效。

9. **持续更新**: 在添加新功能时同时编写测试，保持测试套件的更新。

10. **快速反馈**: 测试应该快速运行，提供即时反馈。避免不必要的延迟和等待。 