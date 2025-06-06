<template>
  <div class="input-page">
    <header class="page-header">
      <img src="/images/booktok-logo.png" alt="Booktok Logo" class="logo" />
      <img src="/images/pixel-header.png" alt="Booktok Header" class="header-image-title" />
      <p>输入书籍名称，带您快速读懂这本书</p>
    </header>

    <form @submit.prevent="generateReport" class="input-form" :class="{ 'form-loading': isLoading }">
      <fieldset :disabled="isLoading" class="form-fieldset">
        <div class="form-group">
          <label for="book-query">书名：</label>
          <textarea 
            id="book-query" 
            rows="1" 
            v-model="bookQuery" 
            placeholder="例如：《三体》或 The Three-Body Problem" 
            required 
            ref="bookQueryInput"
          ></textarea>
          <small class="form-hint">请输入您想分析的书籍的准确名称。</small>
        </div>
      </fieldset>

      <button type="submit" :disabled="isLoading" class="submit-btn">
        {{ isLoading ? 'Booktok飞速阅读中...' : '快速读书' }}
      </button>

      <div v-if="isLoading" class="loading-indicator">
        <p>{{ progressMessage }}</p>
        <div class="pixel-loader"></div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar">
            <div class="progress-bar-inner" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="progress-text">已完成 {{ Math.round(progress) }}% - 已用时 {{ formatTime(elapsedTime) }}</div>
        </div>
        
        <div v-if="reportContent" class="streaming-preview">
          <h3>内容预览 ({{ reportContent.length }} 字):</h3>
          <div class="streaming-text-container" ref="previewContainer" @scroll="handleScroll">
            <pre class="streaming-text-display">{{ reportContent }}</pre>
          </div>
        </div>
      </div>

      <div v-if="error" class="error-message">
        <p><strong>处理请求时遇到问题：</strong></p>
        <p>{{ error }}</p>
        <button @click="resetForm" type="button" class="retry-btn">知道了，重试</button>
      </div>
    </form>

    <footer class="page-footer">
      <p>&copy; {{ currentYear }} Booktok. 保留所有权利。</p>
      <p><a href="/privacy-policy">隐私政策</a> | <a href="/terms-of-service">服务条款</a></p>
      <p class="version">版本 1.0.6</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/apiService';

const router = useRouter();

// 基本状态
const bookQuery = ref('');
const bookQueryInput = ref(null);
const isLoading = ref(false);
const error = ref(null);
const reportContent = ref('');
const previewContainer = ref(null);

// 进度相关
const progress = ref(0);
const startTime = ref(0);
const elapsedTime = ref(0);

// 配置常量
const CONFIG = {
  TARGET_LENGTH: 15000,
  INITIAL_DURATION: 25000,
  STREAMING_DURATION: 240000,
  FINAL_DURATION: 3000
};

// 计算属性
const currentYear = computed(() => new Date().getFullYear());

const progressMessage = computed(() => {
  const p = progress.value;
  if (p < 10) return '正在启动AI生成引擎...';
  if (p < 30) return '正在分析书籍内容并构建报告结构...';
  if (p < 60) return '正在生成深度解读内容...';
  if (p < 90) return '正在完善报告细节...';
  if (p < 100) return '正在最后润色和格式化...';
  return '报告生成完成，正在跳转...';
});

// 工具函数
const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}分${seconds % 60}秒` : `${seconds}秒`;
};

// 进度计算（简化版）
const calculateProgress = (contentLength, timeElapsed) => {
  if (timeElapsed < CONFIG.INITIAL_DURATION) {
    return (timeElapsed / CONFIG.INITIAL_DURATION) * 10;
  }
  
  const streamingElapsed = timeElapsed - CONFIG.INITIAL_DURATION;
  const contentRatio = contentLength / CONFIG.TARGET_LENGTH;
  
  // 简化的进度算法
  let contentProgress = Math.min(contentRatio * 75, 75);
  let timeProgress = Math.min((streamingElapsed / CONFIG.STREAMING_DURATION) * 60, 60);
  
  // 早期依赖时间，后期依赖内容
  let combined = contentLength < 1000 ? 
    Math.max(contentProgress, timeProgress * 0.4) :
    Math.max(contentProgress, timeProgress * 0.6);
  
  return Math.min(10 + combined, 90);
};

// 进度更新
let progressAnimationId = null;
const updateProgress = (targetProgress) => {
  const diff = targetProgress - progress.value;
  if (Math.abs(diff) < 0.1) {
    progress.value = targetProgress;
    return;
  }
  
  const step = diff * 0.1;
  progress.value = Math.min(progress.value + step, targetProgress); // 修复：移除90%限制
  
  if (Math.abs(progress.value - targetProgress) > 0.1) {
    progressAnimationId = requestAnimationFrame(() => updateProgress(targetProgress));
  }
};

// 滚动相关
let isAtBottom = true; // 标记用户是否在底部

// 自动滚动到底部（仅当用户在底部时）
const autoScroll = () => {
  if (previewContainer.value && isAtBottom) {
    nextTick(() => {
      const container = previewContainer.value;
      container.scrollTop = container.scrollHeight;
    });
  }
};

// 滚动检测（简化版）
let scrollTimeout = null;
const handleScroll = () => {
  if (scrollTimeout) return;
  
  scrollTimeout = setTimeout(() => {
    if (previewContainer.value) {
      const container = previewContainer.value;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      
      // 检测用户是否在底部（允许3像素误差）
      isAtBottom = (scrollTop + clientHeight) >= (scrollHeight - 3);
    }
    scrollTimeout = null;
  }, 100);
};

// 时间更新器
let timeInterval = null;
const startTimeTracking = () => {
  startTime.value = Date.now();
  timeInterval = setInterval(() => {
    elapsedTime.value = Date.now() - startTime.value;
  }, 1000);
};

const stopTimeTracking = () => {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
};

// 主要生成函数
const generateReport = async () => {
  if (!bookQuery.value.trim()) {
    error.value = '书名不能为空！';
    return;
  }
  
      // 重置状态
    isLoading.value = true;
    error.value = null;
    reportContent.value = '';
    progress.value = 0;
    isAtBottom = true;
  
  startTimeTracking();
  
  // 初始进度动画
  const animateInitial = () => {
    const elapsed = Date.now() - startTime.value;
    if (elapsed < CONFIG.INITIAL_DURATION) {
      progress.value = (elapsed / CONFIG.INITIAL_DURATION) * 10;
      progressAnimationId = requestAnimationFrame(animateInitial);
    }
  };
  progressAnimationId = requestAnimationFrame(animateInitial);

  try {
    const response = await apiService.generateReport({ bookQuery: bookQuery.value });
    
    if (!response.body) {
      throw new Error('无法获取响应流');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      let eolIndex;
      
      while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
        const messageLine = buffer.slice(0, eolIndex);
        buffer = buffer.slice(eolIndex + 2);

        const lines = messageLine.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonData = line.substring(5).trim();
            if (jsonData === '[DONE]') continue;
            
            if (jsonData) {
              try {
                const parsed = JSON.parse(jsonData);
                if (parsed.choices?.[0]?.delta?.content) {
                  reportContent.value += parsed.choices[0].delta.content;
                  
                  // 更新进度（节流）
                  const currentTime = Date.now() - startTime.value;
                  const targetProgress = calculateProgress(reportContent.value.length, currentTime);
                  updateProgress(targetProgress);
                  
                  // 自动滚动
                  autoScroll();
                }
              } catch (e) {
                console.warn('解析JSON失败:', e);
              }
            }
          }
        }
      }
    }

    // 完成动画
    const finishProgress = () => {
      if (progress.value < 100) {
        progress.value = Math.min(progress.value + 2, 100);
        progressAnimationId = requestAnimationFrame(finishProgress);
      } else {
        console.log('进度条达到100%，准备调用finalizeReport');
        finalizeReport();
      }
    };
    progressAnimationId = requestAnimationFrame(finishProgress);

  } catch (err) {
    console.error('生成报告失败:', err);
    error.value = err.message || '生成报告失败，请稍后重试';
    cleanup();
  }
};

// 完成报告
const finalizeReport = () => {
  console.log('finalizeReport 被调用, reportContent长度:', reportContent.value.length);
  
  // 先清理动画
  if (progressAnimationId) {
    cancelAnimationFrame(progressAnimationId);
    progressAnimationId = null;
  }
  
  if (reportContent.value) {
    const reportId = `report-${Date.now()}`;
    localStorage.setItem(reportId, reportContent.value);
    
    console.log('准备跳转到 ReportPage, reportId:', reportId, 'bookName:', bookQuery.value);
    
    // 先设置loading为false，然后再跳转
    isLoading.value = false;
    stopTimeTracking();
    
    router.push({
      name: 'ReportPage',
      params: { reportId },
      query: { bookName: bookQuery.value }
    }).then(() => {
      console.log('路由跳转成功');
    }).catch(err => {
      console.error('路由跳转失败:', err);
    });
  } else {
    console.log('reportContent为空，不进行跳转');
    cleanup();
  }
};

// 清理函数
const cleanup = () => {
  isLoading.value = false;
  stopTimeTracking();
  if (progressAnimationId) {
    cancelAnimationFrame(progressAnimationId);
    progressAnimationId = null;
  }
};

  // 重置表单
  const resetForm = async () => {
    error.value = null;
    reportContent.value = '';
    progress.value = 0;
    isAtBottom = true;
    cleanup();
    
    await nextTick();
    bookQueryInput.value?.focus();
  };

// 生命周期
onMounted(() => {
  bookQueryInput.value?.focus();
});

onUnmounted(() => {
  cleanup();
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
});
</script>

<style scoped>
.input-page {
  max-width: 700px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
  background-color: #f0f0f0;
  border: 2px solid #333;
  box-shadow: 4px 4px 0px #333;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 150px;
  height: auto;
  margin-bottom: 0px;
}

.header-image-title {
  display: block;
  max-width: 350px;
  height: auto;
  margin: 0px auto 15px auto;
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

.form-group textarea {
  width: calc(100% - 20px);
  padding: 10px;
  border: 2px solid #333;
  background-color: #fff;
  font-size: 1em;
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
}

.form-hint {
  display: block;
  font-size: 0.9em;
  color: #555;
  margin-top: 5px;
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
  margin-top: 30px;
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

.pixel-loader {
  width: 40px;
  height: 40px;
  margin: 10px auto;
  border: 4px solid transparent;
  border-top-color: #333;
  border-right-color: #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.progress-bar-wrapper {
  margin: 10px 0 0 0;
  text-align: center;
}

.progress-bar {
  width: 90%;
  height: 16px;
  background: #e0e0e0;
  border: 2px solid #333;
  box-shadow: 2px 2px 0px #333;
  border-radius: 4px;
  margin: 0 auto 4px auto;
  overflow: hidden;
}

.progress-bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 60%, #7be87b 100%);
  transition: width 0.2s;
}

.progress-text {
  font-size: 0.95em;
  color: #333;
  letter-spacing: 1px;
}

.streaming-preview {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border: 2px solid #333;
  border-radius: 4px;
  box-shadow: 2px 2px 0px #333;
}

.streaming-preview h3 {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  color: #333;
  font-weight: bold;
}

.streaming-text-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  padding: 10px;
}

.streaming-text-container::-webkit-scrollbar {
  width: 8px;
}

.streaming-text-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.streaming-text-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.streaming-text-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.streaming-text-display {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.85em;
  line-height: 1.4;
  color: #333;
  margin: 0;
  padding: 0;
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
  
  .form-hint {
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
</style> 
