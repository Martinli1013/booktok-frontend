<template>
  <div class="input-page">
    <header class="page-header">
      <img 
        src="/images/booktok-logo.png" 
        alt="Booktok Logo" 
        class="logo"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
      <img 
        src="/images/pixel-header.png" 
        alt="Booktok - AI深度解读任何书籍" 
        class="header-image-title"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
      <p>输入书籍名称，带您快速读懂这本书</p>
    </header>

    <form @submit.prevent="generateReport" class="input-form" :class="{ 'form-loading': isLoading }">
      <!-- 替换为新的书籍搜索组件 -->
      <BookSearchInput
        v-model="bookQuery"
        :disabled="isLoading"
        @book-selected="handleBookSelected"
        @search-change="handleSearchChange"
        ref="bookSearchInput"
      />
      
      <!-- 选中书籍信息显示 -->
      <div v-if="selectedBookInfo && !isLoading" class="selected-book-info">
        <div class="book-info-header">
          <span class="info-icon">✓</span>
          <span class="info-text">已选择书籍</span>
          <button @click="clearBookSelection" type="button" class="clear-selection-btn">
            更换
          </button>
        </div>
        <div class="book-info-details">
          <strong>{{ selectedBookInfo.title }}</strong>
          <span v-if="selectedBookInfo.author">作者：{{ selectedBookInfo.author }}</span>
          <span v-if="selectedBookInfo.publisher">出版社：{{ selectedBookInfo.publisher }}</span>
        </div>
      </div>
      
      <button type="submit" class="generate-button" :disabled="isLoading || !bookQuery.trim()">
        {{ isLoading ? 'Booktok飞速读书中...' : '快速读书' }}
      </button>

      <!-- 预览区域 -->
      <div v-if="reportContent && isLoading" class="preview-section">
        <div class="preview-header">
          <h3>报告预览</h3>
          <button 
            v-if="!isAtBottom" 
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
    </form>

    <!-- 使用提示 -->
    <div class="usage-tips">
      <div class="tips-header">使用提示</div>
      <ul class="tips-list">
        <li>支持中外文书籍，请输入准确的书名</li>
        <li>生成过程约需3-5分钟，请耐心等待</li>
        <li>尽量保持页面在前台，直至报告生成完毕</li>
        <li>报告将包含作者简介、章节概要等内容</li>
      </ul>
    </div>

    <footer class="page-footer">
      <p>&copy; {{ currentYear }} Booktok. 保留所有权利。</p>
      <p><router-link to="/privacy-policy" class="footer-link">隐私政策</router-link> | <router-link to="/terms-of-service" class="footer-link">服务条款</router-link></p>
      <p class="version">版本 1.1.0</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/apiService';
import BookSearchInput from './BookSearchInput.vue';

const router = useRouter();

// 基本状态
const bookQuery = ref('');
const bookQueryInput = ref(null);
const bookSearchInput = ref(null);
const selectedBookInfo = ref(null);
const isLoading = ref(false);
const error = ref(null);
const reportContent = ref('');
const previewContainer = ref(null);

// 断点续传相关状态
const savedProgress = ref(null);
const currentSessionId = ref(null);
const autoSaveInterval = ref(null);

// 进度相关
const progress = ref(0);
const startTime = ref(0);
const elapsedTime = ref(0);

// 配置常量
const CONFIG = {
  TARGET_LENGTH: 7000,
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

// 书籍选择相关处理函数
const handleBookSelected = (bookInfo) => {
  console.log('书籍已选择:', bookInfo);
  selectedBookInfo.value = bookInfo;
  
  // 更新书名（这将确保后台生成时提供更准确的信息）
  bookQuery.value = bookInfo.title;
  
  // 清除任何现有错误
  error.value = null;
};

const handleSearchChange = (query) => {
  // 当用户手动输入时，清除选中的书籍信息
  if (selectedBookInfo.value && query !== selectedBookInfo.value.title) {
    selectedBookInfo.value = null;
  }
};

const clearBookSelection = () => {
  selectedBookInfo.value = null;
  bookQuery.value = '';
  bookSearchInput.value?.focus();
};

// 进度计算
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
  progress.value = Math.min(progress.value + step, targetProgress);
  
  if (Math.abs(progress.value - targetProgress) > 0.1) {
    progressAnimationId = requestAnimationFrame(() => updateProgress(targetProgress));
  }
};

// 滚动相关
const isAtBottom = ref(true); // 标记用户是否在底部

// 检测用户是否在底部
const checkIfAtBottom = (container) => {
  const threshold = 50; // 50px 的容错范围
  const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
  isAtBottom.value = atBottom;
};

// 处理滚动事件
const handleScroll = (event) => {
  const container = event.target;
  checkIfAtBottom(container);
};

// 手动滚动到底部
const scrollToBottom = () => {
  if (previewContainer.value) {
    nextTick(() => {
      const container = previewContainer.value;
      container.scrollTop = container.scrollHeight;
      isAtBottom.value = true;
    });
  }
};

// 自动滚动到底部（仅当用户在底部时）
const autoScroll = () => {
  if (previewContainer.value && isAtBottom.value) {
    nextTick(() => {
      const container = previewContainer.value;
      container.scrollTop = container.scrollHeight;
    });
  }
};

// 时间跟踪
let timeTrackingInterval = null;

const startTimeTracking = () => {
  startTime.value = Date.now();
  elapsedTime.value = 0;
  
  timeTrackingInterval = setInterval(() => {
    elapsedTime.value = Date.now() - startTime.value;
  }, 1000);
};

const stopTimeTracking = () => {
  if (timeTrackingInterval) {
    clearInterval(timeTrackingInterval);
    timeTrackingInterval = null;
  }
};

// 断点续传管理
const PROGRESS_KEY = 'booktok_progress';
const AUTO_SAVE_INTERVAL = 3000; // 3秒自动保存一次

// 保存进度状态
const saveProgress = () => {
  if (!currentSessionId.value || !bookQuery.value) return;
  
  const progressState = {
    bookName: bookQuery.value,
    sessionId: currentSessionId.value,
    startTime: startTime.value,
    currentContent: reportContent.value,
    lastSaveTime: Date.now(),
    estimatedProgress: progress.value,
    contentLength: reportContent.value.length
  };
  
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressState));
    console.log(`进度已保存: ${progressState.contentLength}字, ${Math.round(progressState.estimatedProgress)}%`);
  } catch (error) {
    console.warn('保存进度失败:', error);
  }
};

// 加载保存的进度
const loadSavedProgress = () => {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      const progressState = JSON.parse(saved);
      console.log('🔍 发现保存的进度:', progressState);
      
      // 检查是否在24小时内
      const hoursSinceLastSave = (Date.now() - progressState.lastSaveTime) / (1000 * 60 * 60);
      console.log(`⏰ 距离上次保存: ${hoursSinceLastSave.toFixed(1)}小时`);
      console.log(`📝 内容长度: ${progressState.contentLength}字`);
      
      if (hoursSinceLastSave < 24 && progressState.contentLength > 50) { // 降低到50字
        console.log('✅ 断点续传条件满足，加载进度');
        savedProgress.value = progressState;
        return progressState;
      } else {
        console.log('❌ 断点续传条件不满足，清理旧数据');
        console.log(`原因: 时间${hoursSinceLastSave >= 24 ? '过期' : '有效'}, 内容${progressState.contentLength <= 50 ? '太少' : '足够'}`);
        localStorage.removeItem(PROGRESS_KEY);
      }
    } else {
      console.log('📭 没有发现保存的进度数据');
    }
  } catch (error) {
    console.warn('⚠️ 加载进度失败:', error);
    localStorage.removeItem(PROGRESS_KEY);
  }
  return null;
};

// 清除保存的进度
const clearSavedProgress = () => {
  savedProgress.value = null;
  localStorage.removeItem(PROGRESS_KEY);
  resetForm();
};

// 仅清除进度数据（不重置表单）
const clearProgressOnly = () => {
  savedProgress.value = null;
  localStorage.removeItem(PROGRESS_KEY);
};

// 从进度继续生成
const resumeFromProgress = async () => {
  if (!savedProgress.value) return;
  
  try {
    // 恢复状态
    bookQuery.value = savedProgress.value.bookName;
    reportContent.value = savedProgress.value.currentContent;
    progress.value = savedProgress.value.estimatedProgress;
    currentSessionId.value = savedProgress.value.sessionId;
    
    // 清除错误状态
    error.value = null;
    isLoading.value = true;
    
    startTimeTracking();
    startAutoSave();
    
    // 构建续传提示词
    const continuePrompt = buildContinuePrompt(
      savedProgress.value.bookName, 
      savedProgress.value.currentContent
    );
    
    // 发起续传请求
    const response = await apiService.generateContinueReport({
      bookQuery: savedProgress.value.bookName,
      existingContent: savedProgress.value.currentContent,
      continuePrompt: continuePrompt
    });
    
    if (!response.body) {
      throw new Error('无法获取响应流');
    }

    const reader = response.body.getReader();
    await processStream(reader);
    
  } catch (err) {
    console.error('断点续传失败:', err);
    error.value = '续传失败: ' + (err.message || '请尝试重新开始');
    cleanup();
  }
};

// 构建续传提示词
const buildContinuePrompt = (bookName, existingContent) => {
  // 分析已生成内容的长度和结构
  const contentLength = existingContent.length;
  let continueInstruction = '';
  
  if (contentLength < 200) {
    // 内容很少，几乎重新开始
    continueInstruction = `请继续完成《${bookName}》的深度解读报告。如果当前内容过少，请在此基础上继续补充完整的报告内容，总长度约5000字。`;
  } else if (contentLength < 1000) {
    continueInstruction = `请继续完成《${bookName}》的深度解读报告，从当前内容自然地继续写下去，直到完成全部约5000字的报告。`;
  } else if (contentLength < 3000) {
    continueInstruction = `请继续完成《${bookName}》的深度解读报告的剩余部分，保持与前文的连贯性，直到完成全部内容。`;
  } else {
    continueInstruction = `请完成《${bookName}》深度解读报告的收尾部分，确保报告完整并以合适的结语结束。`;
  }
  
  return `以下是《${bookName}》深度解读报告的已生成部分：

${existingContent}

请${continueInstruction}

要求：
1. 与上述内容保持完全一致的写作风格和格式
2. 不要重复已有内容  
3. 直接从需要继续的地方开始，无需重新介绍
4. 确保整篇报告的完整性和连贯性
5. 继续使用Markdown格式，保持章节结构清晰
6. 如果已有内容不完整，请在此基础上继续补充和完善`;
};

// 查看已保存的内容
const viewSavedContent = () => {
  if (!savedProgress.value) return;
  
  const reportId = `resume-report-${Date.now()}`;
  localStorage.setItem(reportId, savedProgress.value.currentContent);
  
  router.push({
    name: 'ReportPage',
    params: { reportId },
    query: { 
      bookName: savedProgress.value.bookName,
      isPartial: true
    }
  });
};

// 开始自动保存
const startAutoSave = () => {
  stopAutoSave(); // 确保没有重复的定时器
  autoSaveInterval.value = setInterval(saveProgress, AUTO_SAVE_INTERVAL);
};

// 停止自动保存
const stopAutoSave = () => {
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value);
    autoSaveInterval.value = null;
  }
};

// 主要生成函数
const generateReport = async () => {
  console.log('🚀 generateReport 开始执行');
  console.log('📖 书名:', bookQuery.value);
  
  if (!bookQuery.value.trim()) {
    error.value = '书名不能为空！';
    return;
  }
  
  // 生成新的会话ID
  currentSessionId.value = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log('🆔 会话ID:', currentSessionId.value);
  
  // 重置状态
  isLoading.value = true;
  error.value = null;
  reportContent.value = '';
  progress.value = 0;
  isAtBottom.value = true;
  
  // 清除之前的保存进度（但不重置表单）
  clearProgressOnly();
  console.log('🧹 已清除旧进度');
  
  startTimeTracking();
  startAutoSave(); // 开始自动保存
  console.log('⏰ 已开始时间追踪和自动保存');
  
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
    console.log('📡 开始调用API生成报告');
    
    // 构建请求参数 - 充分利用Google Books API的结构化信息
    let requestParams;
    
    if (selectedBookInfo.value) {
      // 如果用户选中了具体书籍，传递完整的书籍信息
      requestParams = {
        bookQuery: bookQuery.value,
        bookInfo: {
          title: selectedBookInfo.value.title,
          author: selectedBookInfo.value.author,
          isbn: selectedBookInfo.value.isbn
        },
        sessionId: currentSessionId.value
      };
      console.log('📚 使用完整书籍信息:', requestParams.bookInfo);
    } else {
      // 如果没有选中具体书籍，使用原来的格式
      requestParams = {
        bookQuery: bookQuery.value,
        sessionId: currentSessionId.value
      };
      console.log('⚠️ 仅使用原始书名:', bookQuery.value);
    }
    
    const response = await apiService.generateReport(requestParams);
    console.log('✅ API调用成功，收到响应');
    
    if (!response.body) {
      throw new Error('无法获取响应流');
    }

    console.log('🔄 开始处理流式响应');
    const reader = response.body.getReader();
    await processStream(reader);

  } catch (err) {
    console.error('❌ 生成报告失败:', err);
    error.value = err.message || '生成报告失败，请稍后重试';
    cleanup();
  }
};

// 流处理函数
const processStream = async (reader) => {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
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
                  const content = parsed.choices[0].delta.content;
                  reportContent.value += content;
                  
                  // 更新进度
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
        finalizeReport();
      }
    };
    progressAnimationId = requestAnimationFrame(finishProgress);

  } catch (err) {
    console.error('流处理错误:', err);
    error.value = '连接中断，请重新生成报告';
    cleanup();
  } finally {
    try {
      reader.releaseLock();
    } catch (e) {
      console.warn('释放reader锁失败:', e);
    }
  }
};

// 完成报告
const finalizeReport = () => {
  // 先清理动画
  if (progressAnimationId) {
    cancelAnimationFrame(progressAnimationId);
    progressAnimationId = null;
  }
  
  if (reportContent.value) {
    const reportId = `report-${Date.now()}`;
    localStorage.setItem(reportId, reportContent.value);
    
    // 设置loading为false，然后跳转
    isLoading.value = false;
    stopTimeTracking();
    
    router.push({
      name: 'ReportPage',
      params: { reportId },
      query: { bookName: bookQuery.value }
    });
  } else {
    cleanup();
  }
};

// 紧急恢复（查看已生成内容）
const emergencyRecover = () => {
  if (reportContent.value.length > 100) {
    const reportId = `emergency-report-${Date.now()}`;
    localStorage.setItem(reportId, reportContent.value);
    
    cleanup();
    
    router.push({
      name: 'ReportPage',
      params: { reportId },
      query: { 
        bookName: bookQuery.value,
        isPartial: true
      }
    });
  } else {
    error.value = '生成内容太少，请重新开始';
  }
};

// 重置表单
const resetForm = () => {
  cleanup();
  bookQuery.value = '';
  error.value = null;
  reportContent.value = '';
};

// 清理函数
const cleanup = () => {
  isLoading.value = false;
  stopTimeTracking();
  stopAutoSave(); // 停止自动保存
  
  if (progressAnimationId) {
    cancelAnimationFrame(progressAnimationId);
    progressAnimationId = null;
  }
  
  // 清理会话ID
  currentSessionId.value = null;
};

// 生命周期
onMounted(() => {
  // 聚焦输入框
  if (bookQueryInput.value) {
    bookQueryInput.value.focus();
  }
  
  // 检查是否有保存的进度
  const savedProgressData = loadSavedProgress();
  if (savedProgressData) {
    console.log('发现保存的进度:', savedProgressData);
  }
  
  // 添加页面可见性监听器
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  // 如果正在生成且有内容，保存进度
  if (isLoading.value && reportContent.value.length > 200) {
    saveProgress();
  }
  cleanup();
  
  // 清理页面可见性监听器
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

// 页面可见性变化处理函数
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 页面变为后台，保存当前进度
    if (isLoading.value && reportContent.value.length > 200) {
      saveProgress();
      console.log('页面切换到后台，已保存进度');
    }
  } else {
    // 页面变为前台，检查连接状态
    if (isLoading.value && currentSessionId.value) {
      console.log('页面回到前台，检查连接状态');
      // 这里可以添加连接状态检查逻辑
    }
  }
};
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
  max-width: 700px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
  background-color: #f0f0f0 !important;
  border: 2px solid #333;
  box-shadow: 4px 4px 0px #333;
  color: #333 !important;
  color-scheme: light !important; /* 强制浅色模式 */
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header p {
  font-size: 1em; /* 减小两号字体 */
}

.logo {
  width: 200px;
  height: auto;
  margin-bottom: -35px;
  /* 性能优化 */
  will-change: transform;
  transform: translateZ(0);
  image-rendering: optimizeQuality;
  /* 指定明确尺寸避免重排 */
  max-width: 200px;
  aspect-ratio: auto;
}

.header-image-title {
  display: block;
  max-width: 350px;
  height: auto;
  margin: 0 auto;
  /* 性能优化 */
  will-change: transform;
  transform: translateZ(0);
  image-rendering: optimizeQuality;
  /* 指定明确尺寸避免重排 */
  aspect-ratio: auto;
}

.input-form .form-group {
  margin-bottom: 20px;
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

.generate-button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

/* 选中书籍信息显示样式 */
.selected-book-info {
  margin: 16px 0;
  padding: 12px 16px;
  background: #e8f5e8;
  border: 2px solid #28a745;
  border-radius: 8px;
  font-size: 14px;
}

.book-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.info-icon {
  color: #28a745;
  font-weight: bold;
  font-size: 16px;
}

.info-text {
  color: #155724;
  font-weight: 600;
  flex: 1;
}

.clear-selection-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: transparent;
  border: 1px solid #28a745;
  color: #28a745;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-selection-btn:hover {
  background: #28a745;
  color: white;
}

.book-info-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #155724;
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

@media (max-width: 600px) {
  .input-page {
    max-width: 100%;
    padding: 8px;
    border: 2px solid #333; /* 恢复pixel风格边框 */
    box-shadow: 4px 4px 0px #333; /* 恢复pixel风格阴影 */
    margin: 8px auto;
    background-color: #f0f0f0;
  }
  
  .page-header {
    margin-bottom: 8px;
    padding-bottom: 2px;
    min-height: 1.2em;
  }
  
  .logo {
    width: 140px;
    margin-bottom: -35px; /* 负边距让下面的图片更靠近 */
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  
  .header-image-title {
    max-width: 70vw;
    margin-bottom: 6px;
    margin-top: 0; /* 确保没有上边距 */
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  
  .page-header p {
    font-size: 0.85em; /* 减小两号字体 */
    margin-bottom: 2px;
  }
  
  .input-form {
    padding: 0;
  }
  
  .form-group label {
    font-size: 1em;
    margin-bottom: 2px;
  }
  
  .form-group input {
    height: auto;
    font-size: 0.9em;
    padding: 12px;
    width: 100%;
    box-sizing: border-box;
    line-height: 1.4;
  }
  
  .form-hint {
    font-size: 0.75em; /* 减小两号字体，与桌面版保持一致 */
    margin-top: 2px;
    word-break: break-all;
  }
  
  .generate-button {
    font-size: 1.05em;
    padding: 11px;
    margin-top: 10px;
  }
  
  .loading-indicator, .error-message {
    padding: 8px;
    font-size: 0.85em;
  }
  
  .page-footer {
    font-size: 0.8em;
    padding-top: 6px;
    margin-top: 10px;
  }
  
  .page-footer p {
    margin-bottom: 2px;
  }
  
  .page-footer .version {
    margin-bottom: 15px; /* 给版本号添加更多底部间距 */
  }
  
  .preview-container {
    font-size: 0.6em; /* 移动端专用设置 */
    text-align: left !important; /* 确保移动端也是左对齐 */
  }
  
  .preview-container div,
  .preview-container * {
    text-align: left !important; /* 移动端内容左对齐 */
  }
  
  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .scroll-to-bottom-btn {
    align-self: flex-end;
    font-size: 11px;
    padding: 4px 8px;
  }
  
  .scroll-to-bottom-btn svg {
    width: 14px;
    height: 14px;
  }
  
  .progress-text {
    font-size: 0.8em; /* 当前继承桌面端0.95em，可以设为更小 */
  }
  
  .tips-list li {
    font-size: 0.65em; /* 移动端使用更小的字体 */
  }
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
</style> 
