# 部署指南

本文档介绍如何在不同平台部署 ALPHA 系统。

## 🎯 部署选项

### 1. Manus 内置托管（推荐）

**优势**：
- 一键部署
- 自动 SSL 证书
- 内置数据库
- 自动备份
- 自定义域名

**步骤**：
1. 在 Manus 管理界面创建新项目
2. 连接 GitHub 仓库 `ai-lifeStart-system`
3. 配置环境变量（见下方）
4. 点击 "Publish" 按钮
5. 等待部署完成

### 2. Railway

**优势**：
- 免费额度充足
- 自动部署
- 易于扩展
- 支持多种数据库

**步骤**：
1. 访问 https://railway.app
2. 连接 GitHub 账户
3. 创建新项目，选择 `ai-lifeStart-system` 仓库
4. Railway 会自动检测 Node.js 项目
5. 配置环境变量
6. 部署

### 3. Render

**优势**：
- 自动部署
- 免费 PostgreSQL 数据库
- 简单易用

**步骤**：
1. 访问 https://render.com
2. 连接 GitHub 账户
3. 创建新的 Web Service
4. 选择 `ai-lifeStart-system` 仓库
5. 配置环境变量
6. 部署

### 4. Docker + 自建服务器

**优势**：
- 完全控制
- 可自定义配置
- 支持任何服务器

**步骤**：
```bash
# 1. 克隆仓库
git clone https://github.com/632591029/ai-lifeStart-system.git
cd ai-lifeStart-system

# 2. 创建 .env 文件
cp .env.example .env
# 编辑 .env 文件，填入你的配置

# 3. 构建 Docker 镜像
docker build -t ai-lifestart-system:latest .

# 4. 运行容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name ai-lifestart \
  ai-lifestart-system:latest

# 5. 检查日志
docker logs -f ai-lifestart
```

## 🔧 环境变量配置

### 必需变量

```env
# 数据库连接
DATABASE_URL=mysql://user:password@host:3306/database_name

# LLM API 密钥
OPENAI_API_KEY=sk-...
```

### 可选变量

```env
# OAuth（如果使用 Manus 认证）
VITE_OAUTH_PORTAL_URL=...
OAUTH_SERVER_URL=...
VITE_APP_ID=...
JWT_SECRET=...

# 邮件通知
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...

# 数据源 API
ALPHA_VANTAGE_API_KEY=...
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# Agent 配置
AGENT_INFORMATION_ENABLED=true
AGENT_LEARNING_ENABLED=true
AGENT_INVESTMENT_ENABLED=true

# 时区
TIMEZONE=Asia/Shanghai
```

## 📊 数据库设置

### MySQL

```bash
# 1. 创建数据库
mysql -u root -p
CREATE DATABASE alpha_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. 创建用户
CREATE USER 'alpha'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON alpha_system.* TO 'alpha'@'localhost';
FLUSH PRIVILEGES;

# 3. 运行迁移
pnpm db:push
```

### PostgreSQL（Render）

```bash
# Render 会自动提供 DATABASE_URL
# 直接运行迁移
pnpm db:push
```

## 🚀 部署后检查清单

- [ ] 访问应用主页，确保能加载
- [ ] 登录功能正常
- [ ] Dashboard 页面可访问
- [ ] 数据库连接正常
- [ ] LLM API 调用成功
- [ ] 邮件通知能发送（如配置）
- [ ] 日志输出正常

## 🔐 安全建议

1. **环境变量**：
   - 不要在代码中硬编码敏感信息
   - 使用平台的密钥管理功能
   - 定期轮换 API 密钥

2. **数据库**：
   - 启用 SSL 连接
   - 使用强密码
   - 定期备份
   - 限制访问 IP

3. **API 密钥**：
   - 为每个环境使用不同的密钥
   - 监控 API 使用量
   - 设置速率限制

4. **CORS**：
   - 配置允许的域名
   - 避免 `*` 通配符

## 📈 性能优化

### 前端
- 启用 Gzip 压缩
- 使用 CDN 分发静态资源
- 启用浏览器缓存

### 后端
- 启用数据库连接池
- 实现 API 缓存
- 使用 Redis（可选）

### 数据库
- 创建适当的索引
- 定期分析查询性能
- 考虑分区大表

## 🐛 故障排查

### 应用无法启动

```bash
# 检查日志
docker logs ai-lifestart

# 检查环境变量
echo $DATABASE_URL

# 检查数据库连接
mysql -u user -p -h host -D database_name
```

### 数据库连接失败

```bash
# 检查连接字符串
# 确保 host、user、password、database 都正确

# 测试连接
mysql -u user -p -h host
```

### LLM API 调用失败

```bash
# 检查 API 密钥
echo $OPENAI_API_KEY

# 检查 API 限额
# 访问 https://platform.openai.com/account/usage/overview
```

## 📞 支持

如有问题，请：
1. 查看应用日志
2. 检查环境变量配置
3. 在 GitHub 提交 Issue
4. 联系技术支持

## 🔄 更新部署

### Manus
- 推送代码到 GitHub
- Manus 会自动检测并部署

### Railway / Render
- 推送代码到 GitHub
- 平台会自动触发重新部署

### Docker
```bash
# 1. 更新代码
git pull origin main

# 2. 重新构建镜像
docker build -t ai-lifestart-system:latest .

# 3. 停止旧容器
docker stop ai-lifestart

# 4. 运行新容器
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name ai-lifestart \
  ai-lifestart-system:latest
```

---

**最后更新**：2026-01-11
