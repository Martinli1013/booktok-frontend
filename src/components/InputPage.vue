<template>
  <div class="input-page">
    <header class="page-header">
      <img src="/images/booktok-logo.png" alt="Booktok Logo" class="logo" />
      <img src="/images/pixel-header.png" alt="Booktok Header" class="header-image-title" />
      <p>输入书籍名称，带您快速读懂这本书</p>
    </header>

    <form @submit.prevent="handleSubmitReportRequest" class="input-form" :class="{ 'form-loading': isLoading }">
      <fieldset :disabled="isLoading" class="form-fieldset">
        <div class="form-group">
          <label for="book-query">书名：</label>
          <textarea id="book-query" rows="1" v-model="bookQuery" placeholder="例如：《三体》或 The Three-Body Problem" required></textarea>
          <small class="form-hint" v-html="'请输入您想分析的书籍的准确名称。<br>当然，您也可以输入不存在的书名，只不过...'"></small>
        </div>
      </fieldset>

      <button type="submit" :disabled="isLoading" class="submit-btn">
        {{ isLoading ? 'Booktok飞速阅读中...' : '快速读书' }}
      </button>

      <div v-if="isLoading" class="loading-indicator">
        <p>请耐心等候5-10分钟...</p>
        <div class="pixel-loader"></div>
      </div>

      <div v-if="error" class="error-message">
        <p><strong>处理请求时遇到问题：</strong></p>
        <p>{{ error }}</p>
        <button @click="clearErrorAndFocusInput" type="button" class="retry-btn">知道了，重试</button>
      </div>
    </form>

    <footer class="page-footer">
      <p>&copy; {{ new Date().getFullYear() }} Booktok. 保留所有权利。</p>
      <p><a href="/privacy-policy">隐私政策</a> | <a href="/terms-of-service">服务条款</a></p>
      <p class="version">版本 1.0.1</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/apiService';

const router = useRouter();

// 表单数据
const bookQuery = ref('');
// const wordCounts = ref([500, 1000, 3000, 5000, 10000]); // Assuming these were related to old logic or can be removed if not used
// const selectedWordCount = ref(3000);
// const customQuestion = ref('');
// REMOVE_LINE const apiKey = ref('');

// UI状态
const isLoading = ref(false);
const error = ref(null);

// 提交报告请求的逻辑
const handleSubmitReportRequest = async () => {
  console.log('[InputPage] handleSubmitReportRequest: Function called.');
  if (!bookQuery.value) {
    error.value = '书名不能为空！';
    console.log('[InputPage] handleSubmitReportRequest: Book query is empty.');
    return;
  }
  isLoading.value = true;
  error.value = null;
  
  console.log(`[InputPage] handleSubmitReportRequest: Attempting to generate report for book: "${bookQuery.value}"`);

  try {
    console.log('[InputPage] handleSubmitReportRequest: Calling apiService.generateReport with payload:', { bookQuery: bookQuery.value });
    const response = await apiService.generateReport({ bookQuery: bookQuery.value });
    console.log('[InputPage] handleSubmitReportRequest: Received response from apiService.generateReport:', response);

    if (response && response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content) {
      const reportContent = response.data.choices[0].message.content;
      const reportId = `report-${Date.now()}`;
      const bookNameForReport = bookQuery.value; // Capture book name at the time of generation

      console.log(`[InputPage] handleSubmitReportRequest: Report content successfully received. Report ID: ${reportId}, Book Name: ${bookNameForReport}`);
      localStorage.setItem(reportId, reportContent);
      console.log('[InputPage] handleSubmitReportRequest: Report content saved to localStorage.');

      router.push({
        name: 'ReportPage',
        params: { reportId: reportId },
        query: { bookName: bookNameForReport } 
      });
      console.log('[InputPage] handleSubmitReportRequest: Navigating to ReportPage.');
    } else {
      console.error('[InputPage] handleSubmitReportRequest: API response structure is not as expected. Response data:', response ? response.data : 'Response is undefined');
      error.value = '生成报告失败：API响应格式不正确或内容缺失。';
      if (response && response.data && response.data.error && response.data.error.message) {
        error.value += ` (后端错误: ${response.data.error.message})`;
      }
    }
  } catch (apiError) {
    console.error('[InputPage] handleSubmitReportRequest: Error calling apiService.generateReport:', apiError);
    let errorMessage = '生成报告失败，请检查网络连接或稍后再试。';
    if (apiError.response) {
      console.error('[InputPage] handleSubmitReportRequest: API Error Response Data:', apiError.response.data);
      console.error('[InputPage] handleSubmitReportRequest: API Error Response Status:', apiError.response.status);
      console.error('[InputPage] handleSubmitReportRequest: API Error Response Headers:', apiError.response.headers);
      const backendErrorMsg = apiError.response.data && apiError.response.data.error && apiError.response.data.error.message 
                              ? apiError.response.data.error.message 
                              : '未知后端错误';
      errorMessage = `API错误 (${apiError.response.status}): ${backendErrorMsg}`;
       if (apiError.response.data && apiError.response.data.error && apiError.response.data.error.param) {
        errorMessage += ` (参数: ${apiError.response.data.error.param})`;
      }
      if (apiError.response.data && apiError.response.data.error && apiError.response.data.error.code) {
        errorMessage += ` (代码: ${apiError.response.data.error.code})`;
      }
    } else if (apiError.request) {
      console.error('[InputPage] handleSubmitReportRequest: API Error - No response received:', apiError.request);
      errorMessage = '生成报告失败：未能从服务器获取响应。';
    } else {
      console.error('[InputPage] handleSubmitReportRequest: API Error - Request setup issue:', apiError.message);
      errorMessage = `生成报告失败：请求设置错误 (${apiError.message})。`;
    }
    error.value = errorMessage;
  } finally {
    isLoading.value = false;
    console.log('[InputPage] handleSubmitReportRequest: Processing finished, isLoading set to false.');
  }
};

const clearError = () => {
  error.value = null;
};

// 显示最近报告的逻辑 (后续填充)
const showRecentReports = () => {
  console.log('显示最近报告');
  // 实际应用中可能会打开一个模态框或跳转到新页面
  // 例如: router.push({ name: 'RecentReportsPage' });
};
</script>

<style scoped>
/* 基础样式，后续可以替换为像素风格 */
.input-page {
  max-width: 700px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif; /* 稍后替换为像素字体 */
  background-color: #f0f0f0; /* 示例背景色 */
  border: 2px solid #333; /* 像素风格边框 */
  box-shadow: 4px 4px 0px #333; /* 像素风格阴影 */
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 150px; /* Increased logo size */
  height: auto;
  margin-bottom: 0px; /* Further reduced space below logo */
}

/* Style for the new header image that replaces H1 */
.header-image-title {
  display: block; 
  max-width: 350px; 
  height: auto;   
  margin: 0px auto 15px auto; /* Removed top margin, kept bottom margin for space below Booktok image */
}

.page-header h1 { /* This style might no longer be needed if H1 is removed */
  font-size: 2.5em; 
}

.input-form .form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

.form-group input[type="text"],
.form-group input[type="password"],
.form-group textarea {
  width: calc(100% - 20px);
  padding: 10px;
  border: 2px solid #333;
  background-color: #fff;
  font-size: 1em;
  box-sizing: border-box;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.form-hint, .form-group small {
  display: block;
  font-size: 0.9em;
  color: #555;
  margin-top: 5px;
}

.word-count-options label {
  margin-right: 15px;
  font-weight: normal;
}
.word-count-options input[type="radio"] {
  margin-right: 5px;
}

.submit-btn {
  display: block;
  width: 100%;
  padding: 12px;
  background-color: #4CAF50; 
  color: white;
  border: 2px solid #333;
  font-size: 1.2em;
  cursor: pointer;
  text-align: center;
  box-shadow: 2px 2px 0px #333;
  margin-top: 30px; /* Increased space above the button */
}

.submit-btn:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.submit-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.loading-indicator, .error-message {
  margin-top: 20px;
  padding: 15px;
  border: 2px solid #333;
  text-align: center;
}

.loading-indicator {
  background-color: #e0e0e0;
}

.error-message {
  background-color: #ffdddd;
  color: #d8000c;
}
.error-message button {
    margin-top: 10px;
    padding: 8px 15px;
    background-color: #d8000c;
    color: white;
    border: 1px solid #333;
    cursor: pointer;
}

/* 简单的像素加载器示例 */
.pixel-loader {
  width: 40px;
  height: 40px;
  margin: 10px auto;
  border: 4px solid transparent;
  border-top-color: #333; /* 像素风格颜色 */
  border-right-color: #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.recent-reports-link {
  text-align: center;
  margin-top: 20px;
}
.recent-reports-link a {
  color: #007bff; /* 像素蓝 */
  text-decoration: underline;
}

.page-footer {
  margin-top: 40px;
  text-align: center;
  font-size: 0.9em;
  color: #555;
  border-top: 2px solid #333;
  padding-top: 15px;
}
.page-footer p {
    margin-bottom: 5px;
}
.page-footer a {
    color: #333;
}
</style> 