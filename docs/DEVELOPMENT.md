# 开发指南

## 环境设置

1. 克隆仓库：
```bash
git clone https://github.com/samzong/chrome-tabboost.git
cd chrome-tabboost
```

2. 安装依赖：
```bash
npm install
# 或
yarn
```

## 密钥管理

为了开发和测试 Chrome 扩展，你需要生成自己的密钥文件。这个密钥用于签名你的扩展。

1. 生成新的密钥：
```bash
openssl genrsa -out key.pem 2048
```

⚠️ 重要提示：
- 永远不要将 `key.pem` 提交到版本控制系统
- 将密钥文件保存在安全的地方
- 每个开发者应该使用自己的密钥
- 生产环境的密钥应该单独保管

## 开发流程

1. 开发模式：
```bash
npm run dev
```

2. 构建扩展：
```bash
npm run build
```

3. 打包扩展：
```bash
# 生成 zip 文件（用于 Chrome Web Store）
npm run zip

# 生成 crx 文件（用于本地测试）
npm run package
```

4. 验证扩展：
```bash
npm run validate
```

## 发布流程

1. 设置环境变量：
- 复制 `.env.example` 到 `.env`
- 填写必要的凭证信息

2. 发布到 Chrome Web Store：
```bash
# 发布到测试用户
npm run publish:test

# 发布到所有用户
npm run publish
```

## 注意事项

1. 密钥安全：
- 生产环境的密钥应该由项目管理员安全保管
- 开发者使用自己的本地密钥进行测试
- 不要在任何公开场合分享密钥

2. 版本控制：
- 所有构建产物都不应该提交到仓库
- 确保 `.gitignore` 正确配置
- 定期检查是否有敏感信息被意外提交

3. 最佳实践：
- 每次发布前运行验证
- 保持版本号的正确更新
- 记录所有重要的更改 