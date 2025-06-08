<template>
  <div class="legal-page">
    <header class="page-header">
      <a href="/" class="back-link">&lt; 返回首页</a>
      <h1>隐私政策</h1>
    </header>
    <div class="content">
      <h2>Booktok 隐私政策</h2>
      <p>最后更新：{{ new Date().toLocaleDateString() }}</p>

      <p>欢迎使用 Booktok！我们致力于保护您的个人信息和您的隐私权。如果您对我们的政策或我们关于您的个人信息的做法有任何疑问或疑虑，请通过 martinli_1013@yahoo.com 与我们联系。</p>

      <h3>我们收集哪些信息？</h3>
      <p>我们可能会收集您在与服务交互时自愿提供给我们的个人信息，例如：</p>
      <ul>
        <li>当您提交书名进行分析时，我们会收集您输入的书名。</li>
        <li>我们可能会收集非个人身份信息，例如您的浏览器类型、操作系统以及有关您如何使用我们服务的信息，以改善我们的服务。</li>
      </ul>
      <p>我们不收集任何API密钥或付款信息，因为这些是通过第三方平台（如淘宝和DeepSeek API）处理的。</p>

      <h3>我们如何使用您的信息？</h3>
      <p>我们使用收集到的信息：</p>
      <ul>
        <li>提供和运营我们的服务，即生成书籍分析报告。</li>
        <li>改进我们的服务和用户体验。</li>
        <li>监控服务的使用情况。</li>
      </ul>

      <h3>您的信息会与任何人共享吗？</h3>
      <p>我们不会与第三方共享、出售、出租或交易您的任何个人信息，除非法律要求或为了提供服务（例如，将书名发送给AI模型API以生成报告）。</p>
      <p>请注意，Booktok 使用 DeepSeek API 生成报告。您提交的书名将发送到此服务。我们建议您查阅 DeepSeek 的隐私政策以了解他们如何处理数据。</p>

      <h3>数据存储和安全</h3>
      <p>我们目前不存储用户账户或报告历史记录。生成的报告在您的浏览器会话期间可用，或者如果您选择下载或通过电子邮件发送。</p>
      <p>我们采取合理的措施来保护您的信息，但没有任何电子传输或存储方法是100%安全的。</p>

      <h3>数据保留</h3>
      <p>我们仅在为您提供服务所必需的时间内保留您输入的信息（例如书名）。由于我们不存储报告或用户账户，因此没有长期的数据保留。</p>

      <h3>您的隐私权</h3>
      <p>根据您所在的位置，您可能拥有与您的个人信息相关的某些权利。由于我们的服务性质简单，且不存储个人数据，因此这些权利的应用可能有限。如果您有任何疑虑，请与我们联系。</p>

      <h3>本政策的更新</h3>
      <p>我们可能会不时更新本隐私政策。更新后的版本将以更新的"最后更新"日期标明，并且更新后的版本将在可访问时立即生效。我们鼓励您经常查看本隐私政策，以了解我们如何保护您的信息。</p>

      <h3>联系我们</h3>
      <p>如果您对本隐私政策有任何疑问或评论，可以通过以下方式与我们联系：martinli_1013@yahoo.com</p>
    </div>
    <footer class="page-footer">
      <p>&copy; {{ new Date().getFullYear() }} Booktok. 保留所有权利。</p>
    </footer>
  </div>
</template>

<script setup>
// No specific script logic needed for this simple page
</script>

<style scoped>
/* 全局深色模式防护 */
@media (prefers-color-scheme: dark) {
  .legal-page, .legal-page * {
    color-scheme: light !important;
  }
}

.legal-page {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif; /* 稍后替换为像素字体 */
  background-color: #f9f9f9 !important;
  border: 2px solid #333;
  box-shadow: 2px 2px 0px #333;
  color: #333 !important;
  color-scheme: light !important; /* 强制浅色模式 */
}

.page-header {
  text-align: left;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #ccc;
  position: relative;
  min-height: 2em; 
}

.page-header h1 {
  text-align: center;
  margin:0;
  color: #333 !important;
}

.back-link {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    color: #007bff !important;
    text-decoration: none;
}
.back-link:hover {
    text-decoration: underline;
}

.content {
  padding: 10px;
  line-height: 1.6;
  text-align: left;
  color: #333 !important;
}
.content h2 {
  font-size: 1.5em;
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: #333 !important;
}
.content h3 {
  font-size: 1.2em;
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: #333 !important;
}
.content p, .content ul {
  margin-bottom: 1em;
  color: #333 !important;
}
.content ul {
  padding-left: 20px;
}
.content li {
  color: #333 !important;
}

.page-footer {
  margin-top: 30px;
  text-align: center;
  font-size: 0.9em;
  color: #555 !important;
  border-top: 2px solid #333;
  padding-top: 15px;
}

@media (max-width: 600px) {
  .legal-page {
    max-width: 100vw;
    padding: 8px;
    border-width: 1px;
    box-shadow: none;
    margin: 0;
    background-color: #f9f9f9 !important;
  }
  .page-header {
    margin-bottom: 12px;
    padding-bottom: 6px;
    min-height: 1.5em;
  }
  .page-header h1 {
    font-size: 1.2em;
    padding: 0;
    color: #333 !important;
  }
  .back-link {
    font-size: 0.8em;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    color: #007bff !important;
  }
  .content {
    padding: 2px;
    font-size: 0.8em;
    color: #333 !important;
  }
  .content h2 {
    font-size: 1.5em;
    margin-top: 0.5em;
    margin-bottom: 0.3em;
    color: #333 !important;
  }
  .content h3 {
    font-size: 1em;
    margin-top: 0.5em;
    margin-bottom: 0.3em;
    color: #333 !important;
  }
  .content p, .content ul {
    margin-bottom: 0.7em;
    color: #333 !important;
  }
  .content ul {
    padding-left: 16px;
    font-size: 0.8em;
  }
  .content li {
    color: #333 !important;
  }
  .page-footer {
    font-size: 0.6em;
    padding-top: 8px;
    margin-top: 18px;
    color: #555 !important;
  }
}
</style> 