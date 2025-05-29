<template>
  <div class="legal-page">
    <header class="page-header">
      <a href="/" class="back-link">&lt; 返回首页</a>
      <h1>服务条款</h1>
    </header>
    <div class="content">
      <h2>Booktok 服务条款</h2>
      <p>最后更新：{{ new Date().toLocaleDateString() }}</p>

      <p>欢迎使用 Booktok！这些服务条款（"条款"）管辖您对我们网站和服务的访问和使用。通过访问或使用服务，您同意受这些条款的约束。</p>

      <h3>1. 服务描述</h3>
      <p>Booktok 提供使用人工智能生成的书籍分析报告。用户输入书名，我们的服务会生成一份报告。目前，服务生成固定长度（约10,000字）的中文报告。</p>

      <h3>2. 用户资格和责任</h3>
      <ul>
        <li>您必须年满18岁才能使用本服务。</li>
        <li>您同意仅将本服务用于合法目的，并遵守所有适用的法律法规。</li>
        <li>您有责任确保您输入的书名的准确性。</li>
        <li>您理解报告由AI生成，可能包含不准确之处或错误。Booktok 不对报告内容的准确性、完整性或可靠性作任何保证。</li>
        <li>报告仅供个人学习和参考之用。您不得将报告用于任何商业目的或代表任何第三方。</li>
        <li>您不得使用本服务分析任何侵犯版权或您无权分析的书籍（例如未出版的手稿）。</li>
      </ul>

      <h3>3. 付款和积分</h3>
      <p>要使用本服务，您需要通过指定渠道（例如淘宝）购买API密钥/积分。这些积分将用于生成报告。每次报告生成的成本将在您确认之前显示。API密钥的有效期和使用条款将由密钥提供商规定（例如，自购买之日起一年）。</p>

      <h3>4. 知识产权</h3>
      <ul>
        <li>Booktok 服务（包括其外观和感觉、品牌）的所有权利、所有权和利益均归 Booktok 所有。</li>
        <li>由服务生成的报告的版权归 Booktok 所有。您可以下载和使用报告供个人参考，但不得重新分发、出售或声称是您自己的作品。</li>
        <li>所有报告都将包含"由 Booktok 生成"的水印。</li>
      </ul>

      <h3>5. 服务变更和终止</h3>
      <p>我们保留随时修改或终止服务的权利，恕不另行通知。我们不对服务的任何修改、暂停或中止向您或任何第三方承担责任。</p>
      <p>如果我们认为您违反了这些条款，我们可能会终止或暂停您访问我们的服务。</p>

      <h3>6. 免责声明</h3>
      <p>本服务按"原样"和"可用"的基础提供，不作任何明示或暗示的保证。我们不保证服务不会中断、没有错误或完全安全。AI生成的报告可能包含不准确或不完整的信息。您使用本服务的风险自负。</p>
      <p>对于因使用或无法使用本服务或其内容而导致的任何间接、偶然、特殊、后果性或惩罚性损害，Booktok概不负责。</p>

      <h3>7. 遵守法律</h3>
      <p>您同意遵守与您使用服务相关的所有当地法律法规，包括与数据隐私和内容相关的法律法规。您同意遵守我们AI服务提供商（DeepSeek）的使用条款。</p>

      <h3>8. 条款变更</h3>
      <p>我们可能会不时修改这些条款。如果我们做出重大更改，我们将通过在我们的网站上发布通知或通过其他方式通知您。您在更改生效后继续使用服务即表示您同意修订后的条款。</p>

      <h3>9. 联系我们</h3>
      <p>如果您对这些服务条款有任何疑问，可以通过以下方式与我们联系：martinli_1013@yahoo.com</p>

      <h3>10. 年龄限制通知</h3>
      <p>本服务仅供18岁及以上用户使用。</p>
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
/* Reuse styles from PrivacyPolicyPage.vue or define common legal page styles */
.legal-page {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif; /* 稍后替换为像素字体 */
  background-color: #f9f9f9;
  border: 2px solid #333;
  box-shadow: 2px 2px 0px #333;
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
}

.back-link {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    color: #007bff;
    text-decoration: none;
}
.back-link:hover {
    text-decoration: underline;
}

.content {
  padding: 10px;
  line-height: 1.6;
  text-align: left;
}
.content h2 {
  font-size: 1.5em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}
.content h3 {
  font-size: 1.2em;
  margin-top: 1em;
  margin-bottom: 0.5em;
}
.content p, .content ul {
  margin-bottom: 1em;
}
.content ul {
  padding-left: 20px;
}

.page-footer {
  margin-top: 30px;
  text-align: center;
  font-size: 0.9em;
  color: #555;
  border-top: 2px solid #333;
  padding-top: 15px;
}
</style> 