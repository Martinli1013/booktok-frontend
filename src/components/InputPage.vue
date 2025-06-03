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
        <p>请耐心等候，预计需要5-10分钟...</p>
        <div class="pixel-loader"></div>
        <div class="fake-progress-bar-wrapper">
          <div class="fake-progress-bar">
            <div class="fake-progress-bar-inner" :style="{ width: realProgress + '%' }"></div>
          </div>
          <div class="fake-progress-text">已完成 {{ realProgress }}%</div>
        </div>
        <!-- Streaming content preview -->
        <div v-if="streamingReportContent" class="streaming-preview">
          <h3>报告内容预览:</h3>
          <pre class="streaming-text-display">{{ streamingReportContent }}</pre>
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
      <p class="version">版本 1.0.4</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/apiService';

const router = useRouter();

// 表单数据
const bookQuery = ref('');
const bookQueryInput = ref(null);

// UI状态
const isLoading = ref(false);
const error = ref(null);
const streamingReportContent = ref(''); // For displaying streamed content
const realProgress = ref(0); // For true progress tracking
const TARGET_CHAR_COUNT = 12000; // Updated target character count

let animationFrameId = null; // For managing progress animation

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
  streamingReportContent.value = ''; 
  realProgress.value = 0; 
  if (animationFrameId) cancelAnimationFrame(animationFrameId); // Cancel any previous animation

  console.log(`[InputPage] handleSubmitReportRequest: Attempting to generate report for book: "${bookQuery.value}"`);

  try {
    console.log('[InputPage] handleSubmitReportRequest: Calling apiService.generateReport with payload:', { bookQuery: bookQuery.value });
    const response = await apiService.generateReport({ bookQuery: bookQuery.value });
    console.log('[InputPage] handleSubmitReportRequest: Received response from apiService.generateReport (should be a Response object):', response);

    if (!response.body) {
      throw new Error('Response body is undefined, cannot process stream.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[InputPage] Stream finished.');
        // Stream is done, now we can complete the progress to 100%
        // This will be handled by the animation logic or direct set after the loop
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
        const messageLine = buffer.slice(0, eolIndex);
        buffer = buffer.slice(eolIndex + 2);

        const lines = messageLine.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonData = line.substring(5).trim();
            if (jsonData === '[DONE]') {
              console.log('[InputPage] Received [DONE] marker from stream.');
              // Stream is done, now we can complete the progress to 100%
              // This will be handled by the animation logic or direct set after the loop
              continue; 
            }
            if (jsonData) {
              try {
                const parsed = JSON.parse(jsonData);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                  if (parsed.choices[0].delta.content) {
                    streamingReportContent.value += parsed.choices[0].delta.content;
                    const currentCharCount = streamingReportContent.value.length;
                    // Progress is based on TARGET_CHAR_COUNT but capped at 95% during streaming.
                    const progressBasedOnChars = Math.floor((currentCharCount / TARGET_CHAR_COUNT) * 100);
                    realProgress.value = Math.min(progressBasedOnChars, 95); // Cap at 95%
                  } 
                } else if (parsed.error) {
                  console.error('[InputPage] Stream error object from API:', parsed.error);
                  error.value = `流式传输错误: ${parsed.error.message || JSON.stringify(parsed.error)}`;
                }
              } catch (e) {
                console.warn('[InputPage] Failed to parse JSON from stream data line:', jsonData, e);
              }
            }
          }
        }
      }
    }
    // End of while (true) for reader

    const finalizeReportGeneration = () => {
      if (streamingReportContent.value) {
        const reportContent = streamingReportContent.value;
        const reportId = `report-${Date.now()}`;
        const bookNameForReport = bookQuery.value;

        console.log(`[InputPage] handleSubmitReportRequest: Report content successfully streamed. Report ID: ${reportId}, Book Name: ${bookNameForReport}`);
        localStorage.setItem(reportId, reportContent);
        console.log('[InputPage] handleSubmitReportRequest: Full report content saved to localStorage.');
        
        isLoading.value = false;
        router.push({
          name: 'ReportPage',
          params: { reportId: reportId },
          query: { bookName: bookNameForReport }
        });
        console.log('[InputPage] handleSubmitReportRequest: Navigating to ReportPage.');
      } else if (!error.value) { 
        console.error('[InputPage] handleSubmitReportRequest: Stream completed but no content was received or error previously set.');
        error.value = '报告生成失败：未能从流中获取任何内容。';
        isLoading.value = false;
      } else { 
          isLoading.value = false; 
      }
    };

    // Animate progress to 100% if not already there
    // If stream completed and content was received, progress should go to 100%.
    if (streamingReportContent.value) { // Only animate or finalize if content exists
      let currentProg = realProgress.value; // Could be at 95% or less
      const targetProg = 100;

      const animateFinalProgress = () => {
        if (currentProg < targetProg) {
          currentProg = Math.min(currentProg + 5, targetProg); // Increment, cap at 100
          realProgress.value = currentProg;
          animationFrameId = requestAnimationFrame(animateFinalProgress);
        } else {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
          finalizeReportGeneration(); // Call finalize after animation completes
        }
      };
      animationFrameId = requestAnimationFrame(animateFinalProgress);
    } else {
      // If no content, but stream ended (e.g. error before content or empty report)
      // or if error.value is already set, finalize directly.
      // If there was an error, isLoading should be false.
      // If no content and no error, it's a scenario to show an error message.
      realProgress.value = 100; // Mark as 100% if trying to finalize without content for some reason.
      finalizeReportGeneration();
    }

  } catch (apiError) {
    console.error('[InputPage] handleSubmitReportRequest: Error processing report request or stream:', apiError);
    let errorMessage = '生成报告失败，请检查网络连接或稍后再试。';
    if (apiError && apiError.message) {
        if (apiError.message.toLowerCase().includes('load failed') || apiError.message.toLowerCase().includes('network request failed')) {
            errorMessage = '网络连接中断（可能由于切换应用导致）。请尝试重新生成报告。';
        } else {
            errorMessage = `错误: ${apiError.message}`;
        }
    }
    error.value = errorMessage;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    isLoading.value = false; 
  } 
  // No finally block needed for old fake loader timers

  if (bookQueryInput.value) { 
    bookQueryInput.value.focus();
  } else {
    console.warn('[InputPage] bookQueryInput ref is not available to focus.');
  }
};

const clearErrorAndFocusInput = async () => {
  error.value = null;
  streamingReportContent.value = ''; 
  realProgress.value = 0; 
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  await nextTick(); 
  if (bookQueryInput.value) { 
    bookQueryInput.value.focus();
  } else {
    console.warn('[InputPage] bookQueryInput ref is not available to focus.');
  }
};

// Handle page visibility changes
const handleVisibilityChange = () => {
  if (document.hidden === false && isLoading.value && error.value && error.value.includes('网络连接中断')) {
    console.log('[InputPage] Page became visible after a network interruption during loading. Clearing state.');
    clearErrorAndFocusInput(); 
    // Optionally, provide a more specific message or UI indication that it was auto-reset.
  }
};

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId); // Ensure animation is cleaned up
  }
});

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

.streaming-preview {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  max-height: 300px; /* Limit height and make it scrollable */
  overflow-y: auto; /* Add scroll for overflow */
}

.streaming-preview h3 {
  margin-top: 0;
  font-size: 1.1em;
  color: #333;
}

.streaming-text-display {
  white-space: pre-wrap; /* Wrap text and preserve newlines */
  word-wrap: break-word; /* Break long words */
  font-family: monospace; /* Good for seeing raw output */
  font-size: 0.9em;
  color: #555;
}
</style> 