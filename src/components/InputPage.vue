<template>
  <div class="input-page">
    <header class="page-header">
      <img src="/images/booktok-logo.png" alt="Booktok Logo" class="logo" />
      <h1>Booktok</h1>
      <p>输入书籍名称，带您快速读懂这本书</p>
    </header>

    <form @submit.prevent="handleSubmitReportRequest" class="input-form" :class="{ 'form-loading': isLoading }">
      <fieldset :disabled="isLoading" class="form-fieldset">
        <div class="form-group">
          <label for="book-query">书名：</label>
          <textarea id="book-query" rows="1" v-model="bookQuery" placeholder="例如：《三体》或 The Three-Body Problem" required></textarea>
          <small class="form-hint">请输入您想分析的书籍的准确名称。</small>
        </div>
      </fieldset>

      <button type="submit" :disabled="isLoading" class="submit-btn">
        {{ isLoading ? '报告生成中 (预计需要3分钟)...' : '生成解读报告' }}
      </button>

      <div v-if="isLoading" class="loading-indicator">
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
      <p><router-link to="/privacy-policy">隐私政策</router-link> | <router-link to="/terms-of-service">服务条款</router-link></p>
      <p class="version">版本 1.0.0</p>
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
const FIXED_WORD_COUNT = 10000; // Assuming this is still the desired fixed word count

// UI状态
const isLoading = ref(false);
const error = ref(null);

// 提交报告请求的逻辑
const handleSubmitReportRequest = async () => {
  // Updated validation: only check bookQuery
  if (!bookQuery.value.trim()) {
    error.value = '书名不能为空！请输入一个有效的书名。';
    document.getElementById('book-query')?.focus();
    return;
  }
  isLoading.value = true;
  error.value = null;

  try {
    console.log('Calling apiService.generateReport with:', {
      bookQuery: bookQuery.value,
      wordCount: FIXED_WORD_COUNT, // Using fixed word count
      // apiKey field removed from log
    });

    // Using the actual apiService call, not the mocked one
    const response = await apiService.generateReport({
      bookQuery: bookQuery.value,
      wordCount: FIXED_WORD_COUNT,
    });

    console.log('API Response:', response);

    if (response.data && response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message) {
      const reportContent = response.data.choices[0].message.content;
      // Reverted reportTitle generation
      const reportTitle = `《${bookQuery.value}》深度解读报告`;
      console.log('Extracted Report Content:', reportContent);

      router.push({
        name: 'ReportPage',
        query: {
          title: reportTitle,
          content: reportContent,
          book: bookQuery.value,
          wordCount: FIXED_WORD_COUNT
        }
      });
    } else {
      console.error('Invalid response structure from API:', response.data);
      error.value = '从API收到的响应数据格式无效。';
    }

  } catch (e) {
    console.error('API调用失败 (Error calling API):', e);
    if (e.response) {
      console.error('Error data:', e.response.data);
      console.error('Error status:', e.response.status);
      console.error('Error headers:', e.response.headers);
      let message = e.response.data?.error?.message || e.response.statusText || '未知服务器错误';
      // Providing more context for the error message
      if (e.response.data?.error?.type === 'insufficient_quota') {
        message = 'API اعتبار ناکافی است (insufficient quota). لطفاً موجودی خود را بررسی کنید.';
      } else if (e.response.status === 401) {
        message = 'API کلید نامعتبر یا مجوز ندارد (Unauthorized). لطفاً کلید API خود را در new-api بررسی کنید.';
      }
      error.value = `请求失败: ${message} (状态码: ${e.response.status})。请检查您的网络连接和API服务状态。`;
    } else if (e.request) {
      console.error('Error request:', e.request);
      error.value = '网络请求无响应。服务器可能未运行或无法访问，请稍后重试。';
    } else {
      console.error('Error message:', e.message);
      error.value = `发起请求时出错: ${e.message}。`;
    }
  } finally {
    isLoading.value = false;
  }
};

// Reverted function name and added focus logic
const clearErrorAndFocusInput = () => {
  error.value = null;
  document.getElementById('book-query')?.focus();
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
  width: 100px; /* Adjusted logo size */
  height: auto;
  margin-bottom: -15px; /* Further reduced space below logo */
}

.page-header h1 {
  font-size: 2.5em; /* 示例大小 */
  color: #333;
  margin-bottom: 5px;
  margin-top: 0; /* Added to reduce space above title */
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
  width: calc(100% - 20px);
  padding: 10px;
  border: 2px solid #333;
  background-color: #fff;
  font-size: 1em;
  box-sizing: border-box;
  height: 100px; /* Adjusted fixed height */
  resize: none; /* Disable user resizing */
}

.form-hint, .form-group small {
  display: block;
  font-size: 0.9em;
  color: #555;
  margin-top: 5px;
}

.submit-btn {
  display: block;
  width: 100%;
  padding: 12px;
  background-color: #4CAF50; /* 像素绿 */
  color: white;
  border: 2px solid #333;
  font-size: 1.2em;
  cursor: pointer;
  text-align: center;
  box-shadow: 2px 2px 0px #333;
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
  /* Reverted error message styling to previous known good state */
  background-color: #ffebee; /* Lighter red for background */
  color: #c62828; /* Darker red for text */
  border: 1px solid #c62828; /* Red border */
  padding: 15px;
  margin-top: 20px;
  border-radius: 0; /* Pixel style - sharp corners */
  text-align: left;
}
.error-message p {
    margin-bottom: 8px;
}
.error-message p:last-of-type {
    margin-bottom: 15px;
}

.error-message strong {
    font-weight: bold;
    display: block;
    margin-bottom: 5px;
}

.retry-btn {
    margin-top: 10px;
    padding: 8px 15px;
    background-color: #d32f2f; /* Red button */
    color: white;
    border: 1px solid #b71c1c;
    cursor: pointer;
    font-weight: bold;
    display: inline-block;
    box-shadow: 2px 2px 0px #b71c1c; /* Pixel shadow */
}
.retry-btn:hover {
    background-color: #c62828;
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

/* Added back form-loading styles that were previously removed */
.input-form.form-loading .form-fieldset {
  opacity: 0.6;
  pointer-events: none; /* Prevent interaction when loading */
}

.form-fieldset {
  border: none;
  padding: 0;
  margin: 0;
}
</style> 