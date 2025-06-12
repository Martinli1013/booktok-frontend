# Google Books API 设置指南

## 📚 功能说明
新增的书籍搜索联想功能可以：
- 在用户输入书名时提供实时搜索建议
- 显示书籍封面、作者、出版社等信息
- 通过精确的书籍信息降低AI生成报告时的幻觉问题

## 🔑 获取 Google Books API Key

### 步骤1：访问 Google Cloud Console
访问：https://console.cloud.google.com/

### 步骤2：创建或选择项目
- 如果没有项目，点击"创建项目"
- 项目名称可以填：`booktok-books-api`

### 步骤3：启用 Books API
1. 在左侧菜单中选择"API和服务" → "库"
2. 搜索"Books API"
3. 点击"Google Books API"
4. 点击"启用"按钮

### 步骤4：创建API密钥
1. 在左侧菜单中选择"API和服务" → "凭据"
2. 点击"创建凭据" → "API密钥"
3. 复制生成的API密钥

### 步骤5：配置环境变量
在项目根目录创建 `.env` 文件：
```bash
# .env
VUE_APP_GOOGLE_BOOKS_API_KEY=your_api_key_here
```

## 🚀 部署配置

### Cloudflare Pages 部署
在Cloudflare Pages的环境变量中添加：
- 变量名：`VUE_APP_GOOGLE_BOOKS_API_KEY`
- 值：你的Google Books API密钥

## 💰 费用说明
- Google Books API 完全免费
- 每日请求限制：1,000次
- 每秒请求限制：100次
- 对于个人项目完全够用

## 🔧 测试配置
1. 完成上述配置后重启开发服务器
2. 在输入框中输入书名（如"三体"）
3. 应该能看到搜索建议下拉列表

## ⚠️ 注意事项
- API密钥不要提交到Git仓库
- 建议在API控制台中限制密钥的使用范围
- 如果没有配置API密钥，搜索功能会降级但不影响基本使用

## 🛠️ 故障排除

### 问题1：搜索没有结果
- 检查API密钥是否正确配置
- 检查网络连接（可能需要VPN）
- 查看浏览器控制台是否有错误信息

### 问题2：请求过多错误
- Google Books API有速率限制
- 稍等片刻后重试
- 考虑增加防抖延迟

### 问题3：部署后无法搜索
- 确保在部署平台（Cloudflare）配置了环境变量
- 检查环境变量名称是否正确 