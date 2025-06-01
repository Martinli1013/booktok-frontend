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
          <textarea id="book-query" rows="1" v-model="bookQuery" placeholder="例如：《三体》或 The Three-Body Problem" required ref="bookQueryInput"></textarea>
          <small class="form-hint" v-html="'请输入您想分析的书籍的准确名称。<br>您也可以随便输入什么，只不过...'"></small>
        </div>
      </fieldset>

      <button type="submit" :disabled="isLoading" class="submit-btn">
        {{ isLoading ? 'Booktok飞速阅读中...' : '快速读书' }}
      </button>

      <div v-if="isLoading" class="loading-indicator">
        <p>请耐心等候5-10分钟...</p>
        <div class="pixel-loader"></div>
        <div class="fake-progress-bar-wrapper">
          <div class="fake-progress-bar">
            <div class="fake-progress-bar-inner" :style="{ width: Math.floor(fakeProgress) + '%' }"></div>
          </div>
          <div class="fake-progress-text">已完成 {{ Math.floor(fakeProgress) }}%</div>
        </div>
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
      <p class="version">版本 1.0.2</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/apiService';

const router = useRouter();

// 表单数据
const bookQuery = ref('');
const bookQueryInput = ref(null);

// UI状态
const isLoading = ref(false);
const error = ref(null);

// fake loader 相关
const fakeProgress = ref(0);
let progressTimer = null;
let fastFinishTimer = null;
let fakeLoaderStartTime = 0;

function startFakeLoader() {
  fakeProgress.value = 0;
  fakeLoaderStartTime = Date.now();
  function step() {
    // 计算剩余时间和剩余进度，动态调整递增幅度
    let elapsed = (Date.now() - fakeLoaderStartTime) / 1000; // 秒
    let remain = 600 - elapsed; // 剩余秒数
    let remainPercent = 95 - fakeProgress.value;
    let avgStep = remainPercent / (remain / 4); // 4秒一次
    let inc = Math.max(0.1, avgStep * (0.7 + Math.random() * 0.6)); // 0.7~1.3倍
    let delay = 1500 + Math.random() * 5500; // 1.5~7秒
    fakeProgress.value = Math.min(fakeProgress.value + inc, 95);
    if (fakeProgress.value < 95 && isLoading.value) {
      progressTimer = setTimeout(step, delay);
    }
  }
  step();
}

function fastFinishLoaderAndJump(callback) {
  if (progressTimer) clearTimeout(progressTimer);
  // 快速补齐到100%
  function fastStep() {
    if (fakeProgress.value < 100) {
      fakeProgress.value = Math.min(fakeProgress.value + 2, 100);
      fastFinishTimer = setTimeout(fastStep, 30);
    } else {
      callback(); // 进度条到100%立即跳转
    }
  }
  fastStep();
}

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
  fakeProgress.value = 0;
  if (progressTimer) clearTimeout(progressTimer);
  if (fastFinishTimer) clearTimeout(fastFinishTimer);
  startFakeLoader();

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

      // fake loader快速补齐到100%，然后跳转
      fastFinishLoaderAndJump(() => {
        isLoading.value = false; // isLoading is set to false HERE in the success callback
        router.push({
          name: 'ReportPage',
          params: { reportId: reportId },
          query: { bookName: bookNameForReport }
        });
      });
      console.log('[InputPage] handleSubmitReportRequest: Navigating to ReportPage.');
    } else {
      console.error('[InputPage] handleSubmitReportRequest: API response structure is not as expected. Response data:', response ? response.data : 'Response is undefined');
      error.value = '生成报告失败：API响应格式不正确或内容缺失。';
      if (response && response.data && response.data.error && response.data.error.message) {
        error.value += ` (后端错误: ${response.data.error.message})`;
      }
      // fakeProgress.value = 100; // Optional: visually complete progress on error
      if (progressTimer) clearTimeout(progressTimer); // Clear slow timer
      if (fastFinishTimer) clearTimeout(fastFinishTimer); // Clear fast timer if any
      isLoading.value = false; // Set isLoading to false on API response structure error
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
    
    // Clear timers and set isLoading to false on any API catch error
    if (progressTimer) clearTimeout(progressTimer);
    if (fastFinishTimer) clearTimeout(fastFinishTimer);
    isLoading.value = false; 
    
  } finally {
    // The finally block is now less critical for isLoading and fastFinishTimer,
    // as those are handled in the success callback or catch blocks.
    // It could potentially be used to clear progressTimer if it's part of a very long-running process
    // that might not be covered by fastFinishLoaderAndJump's own clearing.
    // For now, let's leave it minimal or even empty.
    // console.log('[InputPage] handleSubmitReportRequest: Finally block executed.');
  }
};

const clearError = () => {
  error.value = null;
};

// Added function definition for clearErrorAndFocusInput
const clearErrorAndFocusInput = async () => {
  error.value = null;
  await nextTick(); // Wait for DOM update after error.value is cleared
  if (bookQueryInput.value) { 
    bookQueryInput.value.focus(); // Now uncommented
  } else {
    console.warn('[InputPage] bookQueryInput ref is not available to focus.');
  }
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

@media (max-width: 600px) {
  .input-page {
    max-width: 100%;
    padding: 0 8px;
    border-width: 1px;
    box-shadow: none;
    margin: 0 auto;
    background-color: #f0f0f0;
  }
  .page-header {
    margin-bottom: 8px;
    padding-bottom: 2px;
    min-height: 1.2em;
  }
  .logo {
    width: 110px;
    margin-bottom: 0;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  .header-image-title {
    max-width: 70vw;
    margin-bottom: 6px;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  .page-header p {
    font-size: 1em;
    margin-bottom: 2px;
  }
  .input-form {
    padding: 0;
  }
  .form-group label {
    font-size: 1em;
    margin-bottom: 2px;
  }
  .form-group textarea {
    min-height: 80px;
    font-size: 1.1em;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
  }
  .form-hint, .form-group small {
    font-size: 0.95em;
    margin-top: 2px;
    word-break: break-all;
  }
  .submit-btn {
    font-size: 1.05em;
    padding: 11px;
    margin-top: 10px;
  }
  .loading-indicator, .error-message {
    padding: 8px;
    font-size: 1em;
  }
  .page-footer {
    font-size: 0.8em;
    padding-top: 6px;
    margin-top: 10px;
  }
  .page-footer p {
    margin-bottom: 2px;
  }
}

.fake-progress-bar-wrapper {
  margin: 10px 0 0 0;
  text-align: center;
}
.fake-progress-bar {
  width: 90%;
  height: 16px;
  background: #e0e0e0;
  border: 2px solid #333;
  box-shadow: 2px 2px 0px #333;
  border-radius: 4px;
  margin: 0 auto 4px auto;
  overflow: hidden;
  position: relative;
}
.fake-progress-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 60%, #7be87b 100%);
  transition: width 0.2s;
}
.fake-progress-text {
  font-size: 0.95em;
  color: #333;
  letter-spacing: 1px;
}
</style> 