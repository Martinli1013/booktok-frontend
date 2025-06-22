<template>
  <div class="input-page">
    <header class="page-header">
      <img 
        src="/images/booktok-logo.png" 
        alt="BookTok Logo" 
        class="logo"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
    </header>

    <p class="tagline">输入书籍名称，或通过ISBN精准搜索<br>带您快速读懂这本书</p>

    <form @submit.prevent="generateReport" class="input-form" :class="{ 'form-loading': reportState.isLoading }">
      <!-- 书名搜索组件 -->
      <BookSearchInput
        v-model="titleQuery"
        :disabled="isLoading || isIsbnSearchActive"
        @book-selected="handleBookSelected"
        @search-change="handleTitleSearchChange"
        ref="titleSearchInput"
      />
      
      <div class="divider">或</div>

      <!-- ISBN搜索组件 -->
      <IsbnSearchInput
        v-model="isbnQuery"
        :disabled="isLoading || isTitleSearchActive"
        @book-selected="handleBookSelected"
        @search-change="handleIsbnSearchChange"
        @clear="clearBookSelection"
        ref="isbnSearchInput"
      />
      
      <!-- 选中书籍信息显示 -->
      <div v-if="selectedBookInfo && !isLoading" class="selected-book-info">
          <span class="info-icon">✓</span>
        <div class="book-info-details">
          <strong>{{ selectedBookInfo.title }}</strong>
          <span v-if="selectedBookInfo.author">作者：{{ selectedBookInfo.author }}</span>
          <span v-if="selectedBookInfo.isbn">ISBN: {{ selectedBookInfo.isbn }}</span>
        </div>
        <button @click="clearBookSelection" type="button" class="clear-selection-btn">
          更换
        </button>
      </div>
      
      <button type="submit" class="generate-button" :disabled="isLoading || !isReadyToSubmit">
        {{ isLoading ? 'BookTok飞速读书中...' : '快速读书' }}
      </button>
    </form>

    <!-- 将加载、预览和错误部分移出表单，以避免 pointer-events: none 的影响 -->
      <div v-if="reportContent && isLoading" class="preview-section">
        <div class="preview-header">
          <h3>报告预览</h3>
          <button 
          v-if="userHasScrolledUp" 
            @click="scrollToBottom" 
            class="scroll-to-bottom-btn"
            title="回到最新内容"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
            </svg>
            回到最新
          </button>
        </div>
        <div class="preview-container" ref="previewContainer" @scroll="handleScroll">
          <div v-html="reportContent.replace(/\n/g, '<br>')"></div>
        </div>
      </div>

      <!-- 进度指示器 -->
      <div v-if="isLoading" class="loading-indicator">
        <p>{{ progressMessage }}</p>
        <div class="pixel-loader"></div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar">
            <div class="progress-bar-inner" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="progress-text">已完成 {{ Math.round(progress) }}% - 已用时 {{ formatTime(elapsedTime) }}</div>
        </div>
      </div>

      <!-- 错误处理和恢复选项 -->
      <div v-if="error" class="error-section">
        <div class="error-message">
          <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ error }}</span>
        </div>
        
        <!-- 断点续传恢复选项 -->
        <div v-if="savedProgress && !isLoading" class="recovery-options">
          <div class="recovery-info">
            <p>检测到未完成的报告生成任务</p>
            <p class="progress-details">
              书名: {{ savedProgress.bookName }} | 
              已生成: {{ savedProgress.currentContent.length }}字 | 
              进度: {{ Math.round(savedProgress.estimatedProgress) }}%
            </p>
          </div>
          
          <div class="recovery-actions">
            <button @click="resumeFromProgress" class="recovery-btn primary">
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
              </svg>
              继续生成
            </button>
            <button @click="viewSavedContent" class="recovery-btn secondary">
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clip-rule="evenodd" />
              </svg>
              查看已生成
            </button>
            <button @click="clearSavedProgress" class="recovery-btn danger">
              <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd" />
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM12 7a1 1 0 012 0v4a1 1 0 11-2 0V7z" clip-rule="evenodd" />
              </svg>
              重新开始
            </button>
          </div>
        </div>
        
        <!-- 传统错误恢复选项 -->
        <div v-else-if="error && !isLoading" class="error-actions">
          <button v-if="reportContent.length > 500" @click="emergencyRecover" class="recovery-btn">
            查看已生成内容
          </button>
          <button @click="resetForm" class="recovery-btn secondary">
            重新开始
          </button>
        </div>
      </div>

    <!-- 使用提示 -->
    <div class="usage-tips">
      <div class="tips-header">使用提示</div>
      <ul class="tips-list">
        <li>支持中外文书籍名，和ISBN搜索</li>
        <li>生成过程约需3-5分钟，请耐心等待</li>
        <li>请务必保持页面在前台，直至报告生成完毕</li>
        <li>报告将包含作者简介、章节概要等内容</li>
      </ul>
    </div>

    <footer class="page-footer">
      <p>&copy; {{ currentYear }} BookTok. 保留所有权利。</p>
      <p><router-link to="/privacy-policy" class="footer-link">隐私政策</router-link> | <router-link to="/terms-of-service" class="footer-link">服务条款</router-link></p>
      <p class="version">版本 1.1.6</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/apiService';
import { reportState } from '../services/reportState';
import BookSearchInput from './BookSearchInput.vue';
import IsbnSearchInput from './IsbnSearchInput.vue';

const router = useRouter();

// --- 状态定义 ---
const titleQuery = ref('');
const isbnQuery = ref('');
const titleSearchInput = ref(null);
const isbnSearchInput = ref(null);
const selectedBookInfo = ref(null);
const isLoading = ref(false);
const error = ref(null);
const reportContent = ref('');
const previewContainer = ref(null);
const userHasScrolledUp = ref(false); // 核心状态：用户是否已向上滚动
const savedProgress = ref(null);
const currentSessionId = ref(null);
const autoSaveInterval = ref(null);
const progress = ref(0);
const startTime = ref(0);
const elapsedTime = ref(0);
let progressInterval = null;
let elapsedTimeInterval = null;

const CONFIG = {
  TARGET_LENGTH: 6000,
  // 调整了时间，总时长约4.5分钟，更符合实际
  INITIAL_DURATION: 20000,  // 20秒
  STREAMING_DURATION: 250000, // 4分10秒
};

// --- 核心工具函数 ---
const cleanup = () => {
    if (progressInterval) clearInterval(progressInterval);
    if (elapsedTimeInterval) clearInterval(elapsedTimeInterval);
    progressInterval = null;
    elapsedTimeInterval = null;
    stopAutoSave();
};

const startProgressSimulation = () => {
  cleanup();
  startTime.value = Date.now();
  elapsedTime.value = 0;
  const TOTAL_DURATION = CONFIG.INITIAL_DURATION + CONFIG.STREAMING_DURATION;
  
  elapsedTimeInterval = setInterval(() => {
    elapsedTime.value = Date.now() - startTime.value;
  }, 1000);

  progressInterval = setInterval(() => {
    if (reportState.isComplete || error.value) {
      cleanup();
      if (reportState.isComplete) progress.value = 100;
      return;
    }
    const elapsed = elapsedTime.value;
    const timeProgress = (elapsed / TOTAL_DURATION) * 100;
    const contentProgress = (reportState.reportContent.length / CONFIG.TARGET_LENGTH) * 100;
    const combinedProgress = (timeProgress * 0.3) + (contentProgress * 0.7);
    progress.value = Math.min(combinedProgress, 95);
  }, 500);
};
  
const autoSaveProgress = () => {
    if (isLoading.value && reportContent.value.length > 20) {
        const bookName = selectedBookInfo.value?.title || titleQuery.value;
        const progressData = {
            bookName,
    currentContent: reportContent.value,
            timestamp: Date.now(),
    estimatedProgress: progress.value,
            sessionId: currentSessionId.value,
            bookDetails: {
              bookQuery: titleQuery.value,
              bookInfo: selectedBookInfo.value ? JSON.parse(JSON.stringify(selectedBookInfo.value)) : null
            }
        };
        localStorage.setItem('report_progress', JSON.stringify(progressData));
    }
};

const startAutoSave = () => {
    stopAutoSave();
    autoSaveInterval.value = setInterval(autoSaveProgress, 5000);
};

const stopAutoSave = () => {
    if (autoSaveInterval.value) clearInterval(autoSaveInterval.value);
    autoSaveInterval.value = null;
};
      
// --- 滚动处理 ---
const handleScroll = () => {
    if (previewContainer.value) {
        const { scrollTop, scrollHeight, clientHeight } = previewContainer.value;
        const threshold = 50; // 50px的容错，防止意外触发
        if (scrollHeight - scrollTop - clientHeight > threshold) {
            userHasScrolledUp.value = true;
      } else {
            userHasScrolledUp.value = false;
        }
    }
};

const scrollToBottom = () => {
    if (previewContainer.value) {
        previewContainer.value.scrollTop = previewContainer.value.scrollHeight;
        userHasScrolledUp.value = false;
    }
};

// --- 计算属性 ---
const currentYear = computed(() => new Date().getFullYear());
const isTitleSearchActive = computed(() => titleQuery.value.trim() !== '');
const isIsbnSearchActive = computed(() => isbnQuery.value.trim() !== '');
const isReadyToSubmit = computed(() => (selectedBookInfo.value || titleQuery.value.trim() !== ''));
const progressMessage = computed(() => {
  const p = progress.value;
  if (p < 10) return '正在启动AI生成引擎...';
  if (p < 30) return '正在分析书籍内容并构建报告结构...';
  if (p < 60) return '正在生成深度解读内容...';
  if (p < 95) return '正在完善报告细节...';
  return '正在最后润色和格式化...';
});
const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}分${seconds % 60}秒` : `${seconds}秒`;
};
    
// --- 监听器 ---
watch(reportState, (newState) => {
  isLoading.value = newState.isLoading;
  reportContent.value = newState.reportContent;
  error.value = newState.error;
});

watch(reportContent, () => {
    if (!userHasScrolledUp.value) {
        nextTick(() => scrollToBottom());
    }
});

watch(() => reportState.isComplete, (isComplete) => {
  if (isComplete && !reportState.error) {
    cleanup();
    progress.value = 100;
  router.push({
      name: 'Report',
      state: {
        content: reportState.reportContent,
        bookTitle: selectedBookInfo.value?.title || titleQuery.value,
        author: selectedBookInfo.value?.author,
      }
    });
  }
});

// --- 主要业务逻辑 ---
const generateReport = async () => {
  if (isLoading.value) return;
  error.value = null;
  reportContent.value = '';
  progress.value = 0;
  startTime.value = Date.now();
  elapsedTime.value = 0;
  userHasScrolledUp.value = false; // 重置滚动状态
  const bookDetails = {
    bookQuery: titleQuery.value,
    bookInfo: selectedBookInfo.value
  };
  if (localStorage.getItem('report_progress')) {
      const saved = JSON.parse(localStorage.getItem('report_progress'));
      if (saved.bookName === (bookDetails.bookInfo?.title || bookDetails.bookQuery)) {
          localStorage.removeItem('report_progress');
          savedProgress.value = null;
    }
  }
  apiService.generateReport(bookDetails);
  startProgressSimulation();
  currentSessionId.value = `session_${Date.now()}`;
  startAutoSave();
};

const resumeFromProgress = async () => {
  // 断点续传逻辑暂未适配新版流处理，保留框架
  if (isLoading.value || !savedProgress.value) return;
  console.log("恢复功能暂未完全适配，将仅显示已保存内容。");
  viewSavedContent();
};

const handleBookSelected = (bookInfo) => {
  selectedBookInfo.value = bookInfo;
  if (bookInfo.isbn && isbnQuery.value) titleQuery.value = '';
  else isbnQuery.value = '';
  titleQuery.value = bookInfo.title;
  error.value = null;
};

const handleTitleSearchChange = (query) => {
  if (selectedBookInfo.value && query !== selectedBookInfo.value.title) clearBookSelection();
};

const handleIsbnSearchChange = () => {
  if (selectedBookInfo.value) clearBookSelection();
};

const clearBookSelection = () => {
    selectedBookInfo.value = null;
    titleQuery.value = '';
    isbnQuery.value = '';
};

const clearSavedProgress = () => {
    localStorage.removeItem('report_progress');
    savedProgress.value = null;
};

const emergencyRecover = () => {
    router.push({
        name: 'Report',
        state: { content: reportContent.value || savedProgress.value?.currentContent || '' }
    });
};

const viewSavedContent = () => {
    reportContent.value = savedProgress.value.currentContent;
    userHasScrolledUp.value = true;
};

const resetForm = () => {
    clearBookSelection();
  reportContent.value = '';
    error.value = null;
    clearSavedProgress();
};

// --- 生命周期 ---
onMounted(() => {
  const saved = localStorage.getItem('report_progress');
  if (saved) {
    try {
      savedProgress.value = JSON.parse(saved);
    } catch(e) {
      console.error("无法解析已保存的进度", e);
      localStorage.removeItem('report_progress');
  }
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
/* 强制浅色模式，防止系统深色模式干扰 */
/* 全局深色模式防护 */
@media (prefers-color-scheme: dark) {
  .input-page, .input-page * {
    color-scheme: light !important;
  }
}
.input-page {
  display: flex;
  flex-direction: column;
  align-items: center; /* 确保在宽屏上内容水平居中 */
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: #f7f7f7;
}

.page-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-top: 2rem;
}

.logo {
  max-width: 70%;
  height: auto;
  margin-bottom: 0.2rem;
}

.tagline {
  text-align: center;
  font-size: 1.1rem;
  color: #555;
  margin-bottom: 2rem;
  font-weight: bold;
  font-family: 'Pixelify Sans', sans-serif;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .input-page {
    padding: 15px;
    min-height: auto;
  }
  .page-header {
    margin-bottom: 1.5rem;
  }
.logo {
     max-width: 100%; /* 在移动端稍微缩小logo */
  }
  .tagline {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
}

.input-form {
  width: 100%;
  max-width: 550px;
  display: flex;
  flex-direction: column;
  gap: 1.2rem; /* 增加表单元素间距 */
  margin-bottom: 2rem;
  transition: opacity 0.3s ease;
}

.divider {
  text-align: center;
  color: #888;
  font-family: 'Pixelify Sans', sans-serif;
  font-size: 1.1rem;
  position: relative;
  margin: -5px 0;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: calc(50% - 30px);
  height: 1px;
  background-color: #ddd;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.form-loading {
  opacity: 0.7;
  pointer-events: none;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333 !important;
}

.form-group input {
  width: calc(100% - 20px);
  padding: 10px;
  border: 2px solid #333;
  background-color: #fff !important;
  color: #333 !important;
  font-size: 1em;
  box-sizing: border-box;
}

.form-hint {
  display: block;
  font-size: 0.9em; /* 减小两号字体 */
  color: #555 !important;
  margin-top: 5px;
}

.generate-button {
  display: block;
  width: 100%;
  padding: 15px 20px;
  background-color: #4CAF50;
  color: white;
  border: 2px solid #333;
  font-size: 1.1rem;
  cursor: pointer;
  text-align: center;
  box-shadow: 2px 2px 0px #333;
  margin-top: 30px;
}

.generate-button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

/* 选中书籍信息显示样式 */
.selected-book-info {
  background-color: #f0fdf4; /* 浅绿色背景 */
  border: 1px solid #bbf7d0; /* 绿色边框 */
  border-left-width: 4px;
  border-left-color: #4ade80; /* 左侧加粗边框 */
  border-radius: 8px;
  padding: 0.75rem 1rem;
  animation: fadeIn 0.3s ease-out;
  display: flex;
  align-items: center;
}

.info-icon {
  color: #22c55e;
  font-weight: bold;
  width: 40px;
  flex-shrink: 0;
  font-size: 1.2rem;
  text-align: left;
}

.clear-selection-btn {
  background: none;
  border: none;
  color: #ef4444; /* 红色 */
  font-size: 0.875rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  width: 40px;
  flex-shrink: 0;
  text-align: right;
}

.clear-selection-btn:hover {
  background-color: #fee2e2; /* 悬停时淡红色背景 */
  color: #b91c1c;
}

.book-info-details {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.9rem;
  color: #333;
  text-align: center;
  margin-top: 0;
  flex: 1; /* 让中间部分占据所有剩余空间 */
}

.book-info-details strong {
  font-size: 15px;
  font-weight: 600;
}

.book-info-details span {
  font-size: 13px;
  color: #28a745;
}

.generate-button:hover:not(:disabled) {
  background-color: #45a049;
}

.loading-indicator, .error-message {
  margin-top: 20px;
  padding: 15px;
  border: 2px solid #333;
  text-align: center;
}

.loading-indicator {
  background-color: #e0e0e0 !important;
  color: #333 !important;
}

.error-message {
  background-color: #ffdddd !important;
  color: #d8000c !important;
}

.error-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.error-message button {
  padding: 8px 15px;
  border: 1px solid #333;
  cursor: pointer;
  font-size: 0.9em;
  border-radius: 4px;
  font-weight: 500;
}

.retry-btn {
  background-color: #d8000c;
  color: white;
}

.retry-btn:hover {
  background-color: #b50000;
}

.recover-btn {
  background-color: #ff9800;
  color: white;
  border-color: #333 !important;
}

.recover-btn:hover {
  background-color: #e68900;
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
  color: #333 !important;
  letter-spacing: 1px;
}

.preview-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9 !important;
  border: 2px solid #333;
  border-radius: 4px;
  box-shadow: 2px 2px 0px #333;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.preview-header h3 {
  margin: 0;
  color: #333 !important;
}

.scroll-to-bottom-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #4CAF50;
  color: white;
  border: 1px solid #333;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  animation: pulse-gentle 2s infinite;
}

.scroll-to-bottom-btn:hover {
  background: #45a049;
}

.scroll-to-bottom-btn svg {
  width: 16px;
  height: 16px;
}

@keyframes pulse-gentle {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.preview-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff !important;
  padding: 10px;
  scroll-behavior: smooth;
  text-align: left !important;
}

.preview-container div {
  text-align: left !important;
}

.preview-container * {
  text-align: left !important;
}

.preview-container::-webkit-scrollbar {
  width: 8px;
}

.preview-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.preview-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.preview-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.page-footer {
  margin-top: 40px;
  text-align: center;
  font-size: 0.9em;
  color: #555 !important;
  border-top: 2px solid #333;
  padding-top: 15px;
}

.page-footer p {
  margin-bottom: 5px;
}

.page-footer a, .page-footer .footer-link {
  color: #333;
  text-decoration: none;
  /* Safari移动端修复 */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
}

.page-footer .footer-link:hover, .page-footer .footer-link:active {
  text-decoration: underline;
}

/* 版本信息 */
.version {
  font-size: 0.8em;
  color: #666 !important;
  margin-top: 0.5em;
}

/* 使用提示样式 */
.usage-tips {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9 !important;
  border: 2px solid #333;
  border-radius: 4px;
  box-shadow: 2px 2px 0px #333;
}

.tips-header {
  margin-bottom: 10px;
  font-size: 1.1em;
  font-weight: bold;
  color: #333 !important;
}

.tips-list {
  list-style-type: disc;
  padding-left: 20px;
  color: #555 !important;
}

.tips-list li {
  margin-bottom: 5px;
  text-align: left;
  font-size: 0.85em;
}

/* 错误处理样式 */
.error-section {
  margin: 20px 0;
  padding: 16px;
  background: #fef7f7;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #721c24;
  margin-bottom: 16px;
}

.error-icon {
  width: 20px;
  height: 20px;
  color: #dc3545;
  flex-shrink: 0;
}

.error-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.recovery-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
  text-align: center;
}

.recovery-btn:hover {
  background: #e9ecef;
}

.recovery-btn.secondary {
  background: #6c757d;
  color: white;
}

.recovery-btn.secondary:hover {
  background: #545b62;
}

/* 断点续传恢复选项样式 */
.recovery-options {
  margin-top: 15px;
  padding: 20px;
  background: #f8f9fa !important;
  border: 2px solid #28a745;
  border-radius: 8px;
  color: #333 !important;
}

.recovery-info {
  margin-bottom: 15px;
  text-align: center;
}

.recovery-info p {
  margin: 5px 0;
  color: #333 !important;
}

.progress-details {
  font-size: 0.9em;
  color: #666 !important;
  font-family: 'Courier New', monospace;
}

.recovery-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.recovery-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid #333;
  background: #f9f9f9 !important;
  color: #333 !important;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;
  box-shadow: 2px 2px 0px #333;
  text-decoration: none;
  min-width: 120px;
  text-align: center;
}

.recovery-btn:hover {
  background: #e9e9e9 !important;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #333;
}

.recovery-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px #333;
}

.recovery-btn.primary {
  background: #28a745 !important;
  color: white !important;
  border-color: #1e7e34;
}

.recovery-btn.primary:hover {
  background: #218838 !important;
}

.recovery-btn.secondary {
  background: #007bff !important;
  color: white !important;
  border-color: #0056b3;
}

.recovery-btn.secondary:hover {
  background: #0069d9 !important;
}

.recovery-btn.danger {
  background: #dc3545 !important;
  color: white !important;
  border-color: #bd2130;
}

.recovery-btn.danger:hover {
  background: #c82333 !important;
}

.btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 移动端适配 */
@media (max-width: 600px) {
  .recovery-options {
    padding: 15px;
    margin: 10px;
  }
  
  .recovery-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .recovery-btn {
    justify-content: center;
    min-width: auto;
    width: 100%;
  }
  
  .progress-details {
    font-size: 0.8em;
  }
}

/* 深色模式防护 */
@media (prefers-color-scheme: dark) {
  .recovery-options, .recovery-options * {
    color-scheme: light !important;
  }
  
  .recovery-options {
    background: #f8f9fa !important;
    color: #333 !important;
  }
  
  .recovery-info p, .progress-details {
    color: #333 !important;
  }
  
  .recovery-btn {
    background: #f9f9f9 !important;
    color: #333 !important;
  }
}

@media (prefers-color-scheme: dark) {
  .preview-container {
    color: #000000; /* 纯黑色 */
  }
}
</style> 
