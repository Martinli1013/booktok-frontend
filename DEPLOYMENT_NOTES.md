# Booktok 部署说明

## 移动端Safari路由问题修复

### 问题描述
在移动端Safari浏览器中，用户反馈隐私政策页面打不开。这是典型的SPA（单页应用）路由问题。

### 已实施的解决方案

#### 1. 路由链接修复
- ✅ 将所有 `<a href="">` 链接替换为 `<router-link to="">`
- ✅ 添加了移动端Safari特定的CSS修复
- ✅ 添加了触摸优化样式

#### 2. Vite配置优化
- ✅ 添加了 `historyApiFallback: true` 配置
- ✅ 配置了开发和预览服务器的SPA支持

#### 3. Cloudflare Pages配置
- ✅ 创建了 `public/_redirects` 文件
- ✅ 配置规则：`/*    /index.html   200`

#### 4. HTML Meta标签优化
- ✅ 添加了移动端Safari特定的meta标签
- ✅ 添加了 `apple-mobile-web-app-capable`
- ✅ 添加了 `viewport-fit=cover`

#### 5. 路由器增强
- ✅ 添加了catch-all路由处理404
- ✅ 添加了移动端Safari导航守卫
- ✅ 添加了错误处理和自动重定向

### 部署检查清单

#### Cloudflare Pages设置
1. 确保 `_redirects` 文件存在于 `public/` 目录
2. 构建命令：`npm run build`
3. 输出目录：`dist`
4. 环境变量：确保 `BASE_URL` 正确设置

#### 测试步骤
1. 在桌面浏览器测试所有路由
2. 在移动端Safari测试：
   - 直接访问 `/privacy-policy`
   - 从首页点击隐私政策链接
   - 测试返回首页功能
3. 使用 `test-routes.html` 进行路由测试

#### 移动端Safari特殊注意事项
- Safari对SPA路由处理较严格
- 需要正确的服务器配置支持客户端路由
- 触摸事件需要特殊优化
- 可能需要禁用某些默认行为

### 故障排除

#### 如果隐私政策页面仍然无法访问：

1. **检查Cloudflare Pages配置**
   ```bash
   # 确保_redirects文件内容正确
   cat public/_redirects
   # 应该显示：/*    /index.html   200
   ```

2. **检查构建输出**
   ```bash
   npm run build
   # 确保dist目录包含_redirects文件
   ls dist/_redirects
   ```

3. **浏览器开发者工具检查**
   - 打开Safari开发者工具
   - 查看Network标签页
   - 检查是否有404错误
   - 查看Console是否有JavaScript错误

4. **强制刷新缓存**
   - 在Safari中长按刷新按钮
   - 选择"忽略缓存并刷新页面"

### 联系信息
如果问题仍然存在，请检查：
- Cloudflare Pages的部署日志
- 浏览器控制台错误信息
- 网络请求状态

---
最后更新：2024年12月 