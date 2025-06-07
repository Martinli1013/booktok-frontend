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
        alt="Booktok Header" 
        class="header-image-title"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
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

      <!-- 使用提示 -->
      <div v-if="!isLoading" class="usage-tips">
        <div class="tips-header">💡 使用提示</div>
        <ul class="tips-list">
          <li>生成报告需要5-10分钟，建议保持页面在前台</li>
          <li>如不慎切换页面，返回时系统会自动恢复连接</li>
          <li>请确保网络连接稳定，避免频繁切换网络</li>
        </ul>
      </div>

      <div v-if="isLoading" class="loading-indicator">
        <p>{{ progressMessage }}</p>
        <div class="pixel-loader"></div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar">
            <div class="progress-bar-inner" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="progress-text">已完成 {{ Math.round(progress) }}% - 已用时 {{ formatTime(elapsedTime) }}</div>
        </div>
        
        <!-- 状态警告 -->
        <div v-if="showVisibilityWarning || isReconnecting || suspendDetected" class="warning-section">
          <!-- 页面切换警告 -->
          <div v-if="showVisibilityWarning && !suspendDetected" class="warning-item">
            <svg class="warning-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <div class="warning-content">
              <div class="warning-title">{{ isMobileDevice ? '检测到页面切换' : '页面暂时不可见' }}</div>
              <div class="warning-text">
                {{ isMobileDevice ? '内容正在后台继续生成，请保持应用运行' : '报告正在后台生成，请回到此页面' }}
              </div>
            </div>
          </div>
          
          <!-- 重连状态 -->
          <div v-if="isReconnecting" class="warning-item reconnecting">
            <div class="spinner"></div>
            <div class="warning-content">
              <div class="warning-title">正在恢复连接</div>
              <div class="warning-text">尝试 {{ connectionRetries }}/{{ maxRetries }}</div>
            </div>
          </div>
          
          <!-- 移动端休眠检测警告 -->
          <div v-if="suspendDetected && isMobileDevice" class="warning-item critical">
            <svg class="warning-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <div class="warning-content">
              <div class="warning-title">检测到手机休眠</div>
              <div class="warning-text">连接可能已中断，需要手动恢复</div>
            </div>
          </div>
        </div>
        
        <div v-if="reportContent" class="streaming-preview">
          <h3>内容预览 ({{ reportContent.length }} 字):</h3>
          <div class="streaming-text-container" ref="previewContainer" @scroll="handleScroll">
            <pre class="streaming-text-display">{{ reportContent }}</pre>
          </div>
        </div>
      </div>

      <!-- 错误信息显示 -->
      <div v-if="error" class="error-section">
        <div class="error-message">
          <svg class="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ error }}</span>
        </div>
        
        <!-- 移动端休眠恢复选项 -->
        <div v-if="suspendDetected && isMobileDevice" class="mobile-recovery-actions">
          <button @click="forceRecovery" class="recovery-btn primary">
            <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            尝试恢复连接
          </button>
          
          <button v-if="reportContent.length > 500" @click="emergencyRecover" class="recovery-btn secondary">
            <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clip-rule="evenodd" />
              <path fill-rule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2.5 4a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
            查看已生成内容
          </button>
        </div>
        
        <!-- 一般错误恢复选项 -->
        <div v-else-if="error && !isLoading" class="error-actions">
          <button v-if="reportContent.length > 500" @click="emergencyRecover" class="recovery-btn">
            查看已生成内容
          </button>
          <button @click="resetForm" class="recovery-btn secondary">
            重新开始
          </button>
        </div>
      </div>

      <!-- 调试信息 (仅在开发环境显示) -->
      <div v-if="isDev && isLoading" class="debug-info">
        <small>
          调试: isLoading={{ isLoading }}, isReconnecting={{ isReconnecting }}, 
          connectionRetries={{ connectionRetries }}, showWarning={{ showVisibilityWarning }}, 
          isVisible={{ isPageVisible }}
        </small>
      </div>
    </form>

    <footer class="page-footer">
      <p>&copy; {{ currentYear }} Booktok. 保留所有权利。</p>
      <p><a href="/privacy-policy">隐私政策</a> | <a href="/terms-of-service">服务条款</a></p>
      <p class="version">版本 1.0.12</p>
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

// 连接状态管理
const isPageVisible = ref(true);
const connectionRetries = ref(0);
const maxRetries = ref(3);
const currentReader = ref(null);
const isReconnecting = ref(false);
const lastKnownPosition = ref(0);
const sessionId = ref(null);
const showVisibilityWarning = ref(false);

// 移动端休眠检测
const lastActiveTime = ref(Date.now());
const isMobileDevice = ref(false);
const suspendDetected = ref(false);

// 配置常量
const CONFIG = {
  TARGET_LENGTH: 15000,
  INITIAL_DURATION: 25000,
  STREAMING_DURATION: 240000,
  FINAL_DURATION: 3000,
  RETRY_DELAY: 2000,
  SUSPEND_THRESHOLD: 60000 // 60秒无活动视为休眠
};

// 计算属性
const currentYear = computed(() => new Date().getFullYear());

// 开发环境检测
const isDev = computed(() => import.meta.env.DEV);

const progressMessage = computed(() => {
  if (isReconnecting.value) {
    return `连接中断，正在恢复连接中... (第${connectionRetries.value}次尝试)`;
  }
  
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

// 移动端检测
const detectMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
         ('ontouchstart' in window) || 
         (navigator.maxTouchPoints > 1);
};

// 休眠检测和恢复
const checkForSuspend = () => {
  const now = Date.now();
  const timeDiff = now - lastActiveTime.value;
  
  if (isLoading.value && timeDiff > CONFIG.SUSPEND_THRESHOLD) {
    console.warn('检测到可能的休眠/暂停，时间差:', timeDiff, 'ms');
    suspendDetected.value = true;
    
    // 如果检测到休眠，显示恢复选项
    if (isMobileDevice.value) {
      showMobileSuspendRecovery();
    }
  }
  
  lastActiveTime.value = now;
};

// 移动端休眠恢复
const showMobileSuspendRecovery = () => {
  console.log('显示移动端休眠恢复选项');
  error.value = '检测到手机休眠，连接可能已中断。点击下方按钮恢复或查看已生成内容。';
  
  // 清理可能损坏的连接
  if (currentReader.value) {
    try {
      currentReader.value.releaseLock();
      currentReader.value = null;
    } catch (e) {
      console.warn('清理休眠后的连接失败:', e);
    }
  }
  
  // 标记需要用户干预
  isReconnecting.value = false;
  showVisibilityWarning.value = false;
};

// 强制恢复连接
const forceRecovery = async () => {
  console.log('用户选择强制恢复连接');
  
  // 重置所有状态
  error.value = null;
  suspendDetected.value = false;
  connectionRetries.value = 0;
  lastActiveTime.value = Date.now();
  
  // 检查是否有足够的内容进行紧急恢复
  if (reportContent.value.length > 500) {
    const shouldContinue = confirm('检测到已生成部分内容。\n\n选择"确定"继续生成剩余部分\n选择"取消"查看已生成内容');
    
    if (!shouldContinue) {
      emergencyRecover();
      return;
    }
  }
  
  // 尝试恢复连接
  try {
    await attemptReconnection();
  } catch (err) {
    console.error('强制恢复失败:', err);
    error.value = '恢复失败，建议查看已生成内容或重新开始';
  }
};

// 页面可见性管理
const handleVisibilityChange = () => {
  console.log('页面可见性变化:', document.hidden ? '隐藏' : '显示');
  isPageVisible.value = !document.hidden;
  
  if (document.hidden) {
    // 页面隐藏时记录时间
    lastActiveTime.value = Date.now();
    
    // 显示警告（如果正在生成内容）
    if (isLoading.value) {
      showVisibilityWarning.value = true;
    }
  } else {
    // 页面显示时检查是否休眠过
    checkForSuspend();
    
    // 如果正在加载且有连接问题，尝试恢复
    if (isLoading.value && currentReader.value === null && !isReconnecting.value) {
      console.log('页面恢复显示，检测到连接问题，尝试自动恢复');
      attemptReconnection();
    }
    
    // 清除警告
    if (showVisibilityWarning.value && !suspendDetected.value) {
      showVisibilityWarning.value = false;
    }
  }
};

// 连接重试机制
const attemptReconnection = async () => {
  // 严格的状态检查
  if (isReconnecting.value || !isLoading.value || !isPageVisible.value) {
    console.log('跳过重连: isReconnecting=', isReconnecting.value, 'isLoading=', isLoading.value, 'isPageVisible=', isPageVisible.value);
    return;
  }
  
  // 检查是否已经超过最大重试次数
  if (connectionRetries.value >= maxRetries.value) {
    console.log('已达到最大重试次数，停止重连');
    error.value = `连接多次中断，已尝试重连${maxRetries.value}次。请刷新页面重新开始。`;
    cleanup();
    return;
  }
  
  isReconnecting.value = true;
  connectionRetries.value++;
  console.log(`尝试重连，第${connectionRetries.value}次`);
  
  try {
    // 检查网络连接
    if (!navigator.onLine) {
      throw new Error('网络连接已断开');
    }
    
    // 清理之前的连接
    if (currentReader.value) {
      try {
        currentReader.value.releaseLock();
        currentReader.value = null;
      } catch (e) {
        console.warn('清理旧连接失败:', e);
      }
    }
    
    // 延迟重试
    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
    
    // 再次检查状态
    if (!isLoading.value || !isPageVisible.value) {
      console.log('状态已变化，取消重连');
      isReconnecting.value = false;
      return;
    }
    
    // 重新发起请求，从上次位置继续
    await continueFromLastPosition();
    // 注意：重连状态在continueFromLastPosition中清理
    
  } catch (err) {
    console.error('重连失败:', err);
    
    if (connectionRetries.value >= maxRetries.value) {
      error.value = `连接多次中断，已尝试重连${maxRetries.value}次。请刷新页面重新开始。`;
      cleanup();
    } else {
      // 继续尝试重连，但增加延迟
      console.log(`将在${CONFIG.RETRY_DELAY * connectionRetries.value}ms后再次尝试重连`);
      isReconnecting.value = false; // 先清理重连状态
      setTimeout(() => {
        if (isLoading.value && isPageVisible.value) {
          attemptReconnection();
        }
      }, CONFIG.RETRY_DELAY * connectionRetries.value);
    }
  }
  // 注意：移除了finally块，状态清理在具体的分支中处理
};

// 从上次位置继续 - 添加更严格的状态检查
const continueFromLastPosition = async () => {
  console.log('从上次位置继续生成, 当前内容长度:', reportContent.value.length);
  
  // 状态检查
  if (!isLoading.value || !isPageVisible.value) {
    console.log('状态不正确，取消继续生成');
    return;
  }
  
  try {
    const response = await apiService.generateReport({ 
      bookQuery: bookQuery.value,
      continueFrom: reportContent.value.length > 100 ? reportContent.value : null, // 只有内容足够多时才续传
      sessionId: sessionId.value
    });
    
    if (!response.body) {
      throw new Error('无法获取响应流');
    }
    
    currentReader.value = response.body.getReader();
    
    // 重连成功，立即清理重连状态
    console.log('重连成功，清理重连状态');
    isReconnecting.value = false;
    showVisibilityWarning.value = false;
    
    await processStream(currentReader.value);
    
  } catch (err) {
    console.error('继续生成失败:', err);
    throw err; // 重新抛出错误让上层处理
  }
};

// 网络状态监听
const handleOnlineStatusChange = () => {
  if (!navigator.onLine && isLoading.value) {
    console.log('网络连接断开');
    showVisibilityWarning.value = true;
  } else if (navigator.onLine && isLoading.value && showVisibilityWarning.value) {
    console.log('网络连接恢复');
    showVisibilityWarning.value = false;
    attemptReconnection();
  }
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
  connectionRetries.value = 0;
  isReconnecting.value = false;
  showVisibilityWarning.value = false;
  sessionId.value = `session-${Date.now()}`;
  
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
    const response = await apiService.generateReport({ 
      bookQuery: bookQuery.value,
      sessionId: sessionId.value
    });
    
    if (!response.body) {
      throw new Error('无法获取响应流');
    }

    currentReader.value = response.body.getReader();
    await processStream(currentReader.value);

  } catch (err) {
    console.error('生成报告失败:', err);
    
    // 检查是否是网络相关错误
    if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('NetworkError')) {
      connectionRetries.value++;
      if (connectionRetries.value < maxRetries.value && isPageVisible.value) {
        console.log('检测到网络错误，尝试重连...');
        setTimeout(attemptReconnection, CONFIG.RETRY_DELAY);
        return;
      }
      error.value = '网络连接中断，请检查网络后重试';
    } else {
      error.value = err.message || '生成报告失败，请稍后重试';
    }
    
    cleanup();
  }
};

// 流处理函数
const processStream = async (reader) => {
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      // 检查状态，如果页面不可见且没有在重连，暂停处理
      if (!isPageVisible.value && !isReconnecting.value) {
        console.log('页面不可见，暂停流处理');
        await new Promise(resolve => {
          const checkVisibility = () => {
            if (isPageVisible.value || !isLoading.value) {
              resolve();
            } else {
              setTimeout(checkVisibility, 1000);
            }
          };
          checkVisibility();
        });
      }
      
      // 再次检查是否应该继续
      if (!isLoading.value) {
        console.log('加载已停止，终止流处理');
        break;
      }
      
      const { done, value } = await reader.read();
      if (done) break;
      
      // 更新最后已知位置
      lastKnownPosition.value = reportContent.value.length;
      
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
                  
                  // 移动端每生成500字符保存一次状态
                  if (isMobileDevice.value && reportContent.value.length % 500 < content.length) {
                    saveState();
                  }
                  
                  // 更新已知位置
                  lastKnownPosition.value = reportContent.value.length;
                  
                  // 更新进度（节流）
                  const currentTime = Date.now() - startTime.value;
                  const targetProgress = calculateProgress(reportContent.value.length, currentTime);
                  updateProgress(targetProgress);
                  
                  // 自动滚动
                  autoScroll();
                  
                  // 重置重试计数器（成功接收到数据）
                  if (connectionRetries.value > 0) {
                    console.log('成功接收数据，重置重试计数器');
                    connectionRetries.value = 0;
                    showVisibilityWarning.value = false;
                    isReconnecting.value = false; // 确保重连状态也被清除
                  }
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
    console.error('流处理错误:', err);
    
    // 如果是页面可见时发生错误，且还未达到最大重试次数，尝试重连
    if (isPageVisible.value && connectionRetries.value < maxRetries.value) {
      console.log('流处理中断，标记需要重连');
      // 不立即重连，等待页面可见性变化触发
      if (connectionRetries.value === 0) {
        connectionRetries.value = 1; // 标记有连接问题
      }
      showVisibilityWarning.value = true;
    } else {
      // 达到最大重试次数或页面不可见时的错误
      if (connectionRetries.value >= maxRetries.value) {
        error.value = '连接多次中断，请刷新页面重新开始。';
      } else {
        error.value = '连接中断，请检查网络连接后刷新页面重试。';
      }
      cleanup();
    }
  } finally {
    if (reader && !isReconnecting.value) {
      try {
        reader.releaseLock();
      } catch (e) {
        console.warn('释放reader锁失败:', e);
      }
    }
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
    
    // 清理会话状态（成功完成）
    if (sessionId.value) {
      try {
        localStorage.removeItem('booktok_session_' + sessionId.value);
      } catch (e) {
        console.warn('清理会话状态失败:', e);
      }
    }
    
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
  
  // 清理连接状态
  if (currentReader.value) {
    try {
      currentReader.value.releaseLock();
    } catch (e) {
      console.warn('清理reader失败:', e);
    }
    currentReader.value = null;
  }
  
  connectionRetries.value = 0;
  isReconnecting.value = false;
  showVisibilityWarning.value = false;
  suspendDetected.value = false;
  
  // 清理保存的状态
  if (sessionId.value) {
    try {
      localStorage.removeItem('booktok_session_' + sessionId.value);
    } catch (e) {
      console.warn('清理保存状态失败:', e);
    }
    sessionId.value = null;
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

// 紧急恢复
const emergencyRecover = () => {
  if (reportContent.value && reportContent.value.length > 500) {
    console.log('执行紧急恢复，当前内容长度:', reportContent.value.length);
    
    // 添加一个说明，告诉用户这是不完整的报告
    const recoveredContent = reportContent.value + '\n\n---\n\n**注意：此报告因网络中断未完全生成，以上为已生成的部分内容。**';
    
    // 保存到localStorage
    const reportId = `emergency-${Date.now()}`;
    localStorage.setItem(reportId, recoveredContent);
    
    // 清理状态
    cleanup();
    
    // 跳转到报告页面
    router.push({
      name: 'ReportPage',
      params: { reportId },
      query: { 
        bookName: bookQuery.value,
        emergency: 'true'
      }
    }).then(() => {
      console.log('紧急恢复成功，已跳转到报告页面');
    }).catch(err => {
      console.error('紧急恢复跳转失败:', err);
      error.value = '跳转失败，请手动刷新页面';
    });
  } else {
    error.value = '生成内容太少，无法进行紧急恢复';
  }
};

// 状态保存和恢复
const saveState = () => {
  if (!sessionId.value) return;
  
  const state = {
    sessionId: sessionId.value,
    bookQuery: bookQuery.value,
    reportContent: reportContent.value,
    isLoading: isLoading.value,
    lastActiveTime: lastActiveTime.value,
    timestamp: Date.now(),
    isMobile: isMobileDevice.value,
    progress: {
      charactersGenerated: reportContent.value.length,
      estimatedTotal: CONFIG.TARGET_LENGTH
    }
  };
  
  try {
    localStorage.setItem('booktok_session_' + sessionId.value, JSON.stringify(state));
    console.log('状态已保存:', state);
  } catch (e) {
    console.warn('状态保存失败:', e);
  }
};

const loadState = () => {
  // 检查是否有未完成的会话
  const keys = Object.keys(localStorage).filter(key => key.startsWith('booktok_session_'));
  
  if (keys.length === 0) return false;
  
  // 找到最新的会话
  let latestSession = null;
  let latestTime = 0;
  
  keys.forEach(key => {
    try {
      const state = JSON.parse(localStorage.getItem(key));
      if (state.timestamp > latestTime) {
        latestTime = state.timestamp;
        latestSession = state;
      }
    } catch (e) {
      console.warn('加载状态失败:', e);
      localStorage.removeItem(key);
    }
  });
  
  if (!latestSession) return false;
  
  // 检查会话是否太旧（超过1小时）
  const sessionAge = Date.now() - latestSession.timestamp;
  if (sessionAge > 3600000) { // 1小时
    console.log('会话过期，清理旧状态');
    keys.forEach(key => localStorage.removeItem(key));
    return false;
  }
  
  // 恢复状态
  sessionId.value = latestSession.sessionId;
  bookQuery.value = latestSession.bookQuery || '';
  reportContent.value = latestSession.reportContent || '';
  lastActiveTime.value = latestSession.lastActiveTime || Date.now();
  
  console.log('状态已恢复:', latestSession);
  
  // 如果是移动端且有未完成的内容，提示用户
  if (latestSession.isMobile && latestSession.isLoading && latestSession.reportContent) {
    const shouldContinue = confirm(
      `检测到未完成的报告生成任务：\n\n` +
      `书名：${latestSession.bookQuery}\n` +
      `已生成：${latestSession.reportContent.length}字\n\n` +
      `是否继续生成？`
    );
    
    if (shouldContinue) {
      isLoading.value = true;
      continueFromLastPosition();
    } else {
      // 用户选择不继续，显示已生成的内容
      isLoading.value = false;
      if (latestSession.reportContent.length > 500) {
        isComplete.value = true;
      }
    }
  }
  
  return true;
};

// 生命周期
onMounted(() => {
  console.log('组件已挂载，初始化状态');
  
  // 检测移动设备
  isMobileDevice.value = detectMobileDevice();
  console.log('移动设备检测:', isMobileDevice.value);
  
  // 初始化时间记录
  lastActiveTime.value = Date.now();
  
  // 初始化会话ID
  if (!sessionId.value) {
    sessionId.value = Date.now().toString();
  }
  
  // 尝试恢复之前的状态
  const stateLoaded = loadState();
  if (!stateLoaded) {
    console.log('没有找到可恢复的状态，开始新会话');
  }
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 移动端特殊监听
  if (isMobileDevice.value) {
    // 监听触摸事件来更新活动时间
    const updateActiveTime = () => {
      lastActiveTime.value = Date.now();
      // 触摸时保存状态
      if (isLoading.value) {
        saveState();
      }
    };
    
    window.addEventListener('touchstart', updateActiveTime, { passive: true });
    window.addEventListener('touchend', updateActiveTime, { passive: true });
    
    // 监听页面焦点变化
    window.addEventListener('focus', () => {
      console.log('移动端页面获得焦点');
      checkForSuspend();
    });
    
    window.addEventListener('blur', () => {
      console.log('移动端页面失去焦点');
      lastActiveTime.value = Date.now();
      // 失去焦点时保存状态
      if (isLoading.value) {
        saveState();
      }
    });
    
    // 定期检查是否休眠（仅在生成内容时）
    const suspendCheckInterval = setInterval(() => {
      if (isLoading.value && isPageVisible.value) {
        checkForSuspend();
        // 定期保存状态
        saveState();
      }
    }, 30000); // 每30秒检查一次
    
    // 保存清理函数
    onUnmounted(() => {
      clearInterval(suspendCheckInterval);
    });
  }
  
  // 监听在线状态
  window.addEventListener('online', () => {
    console.log('网络连接恢复');
    if (isLoading.value && suspendDetected.value) {
      console.log('网络恢复，提示用户重连');
      error.value = '网络连接已恢复，点击下方按钮继续生成';
    }
  });
  
  window.addEventListener('offline', () => {
    console.log('网络连接断开');
    if (isLoading.value) {
      error.value = '网络连接已断开，请检查网络后重试';
      // 离线时保存状态
      saveState();
    }
  });
});

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  
  // 清理移动端监听器
  if (isMobileDevice.value) {
    const updateActiveTime = () => {
      lastActiveTime.value = Date.now();
    };
    
    window.removeEventListener('touchstart', updateActiveTime);
    window.removeEventListener('touchend', updateActiveTime);
  }
  
  // 清理连接
  if (currentReader.value) {
    try {
      currentReader.value.releaseLock();
    } catch (e) {
      console.warn('清理连接失败:', e);
    }
  }
  
  console.log('组件已卸载，清理完成');
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

.form-group textarea {
  width: calc(100% - 20px);
  padding: 10px;
  border: 2px solid #333;
  background-color: #fff !important;
  color: #333 !important;
  font-size: 1em;
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;
}

.form-hint {
  display: block;
  font-size: 0.9em; /* 减小两号字体 */
  color: #555 !important;
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

.streaming-preview {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9 !important;
  border: 2px solid #333;
  border-radius: 4px;
  box-shadow: 2px 2px 0px #333;
}

.streaming-preview h3 {
  margin: 0 0 10px 0;
  font-size: 1.1em;
  color: #333 !important;
  font-weight: bold;
}

.streaming-text-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff !important;
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
  color: #333 !important;
  margin: 0;
  padding: 0;
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

.page-footer a {
  color: #333;
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
  
  .form-group textarea {
    min-height: 80px;
    font-size: 0.8em;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .form-hint {
    font-size: 0.75em; /* 减小两号字体，与桌面版保持一致 */
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
  
  .streaming-text-display {
    font-size: 0.6em; /* 移动端专用设置 */
  }
  
  .progress-text {
    font-size: 0.8em; /* 当前继承桌面端0.95em，可以设为更小 */
  }
}

/* 版本信息 */
.version {
  font-size: 0.8em;
  color: #666 !important;
  margin-top: 0.5em;
}

/* 页面可见性警告样式 */
.visibility-warning {
  background-color: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #856404 !important;
  box-shadow: 2px 2px 0px #333;
}

.warning-icon {
  font-size: 1.5em;
  margin-top: 2px;
}

.warning-content h4 {
  margin: 0 0 8px 0;
  color: #856404 !important;
  font-size: 1.1em;
}

.warning-content p {
  margin: 4px 0;
  color: #856404 !important;
  font-size: 0.95em;
  line-height: 1.4;
}

/* 重连状态样式 */
.reconnection-status {
  background-color: #e3f2fd;
  border: 2px solid #2196f3;
  border-radius: 8px;
  padding: 12px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1565c0 !important;
  box-shadow: 2px 2px 0px #333;
}

.reconnect-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e3f2fd;
  border-top: 2px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.reconnection-status p {
  margin: 0;
  color: #1565c0 !important;
  font-size: 0.95em;
  font-weight: 500;
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

/* 调试信息样式 */
.debug-info {
  margin-top: 10px;
  padding: 8px;
  background-color: #f0f8ff !important;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.75em;
  color: #666 !important;
  word-break: break-all;
}

/* 错误处理相关样式 */
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

.mobile-recovery-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.error-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.recovery-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recovery-btn.primary {
  background: #007bff;
  color: white;
}

.recovery-btn.primary:hover {
  background: #0056b3;
}

.recovery-btn.secondary {
  background: #6c757d;
  color: white;
}

.recovery-btn.secondary:hover {
  background: #545b62;
}

.recovery-btn:not(.primary):not(.secondary) {
  background: #f8f9fa;
  color: #495057;
  border: 1px solid #dee2e6;
}

.recovery-btn:not(.primary):not(.secondary):hover {
  background: #e9ecef;
}

.btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* 状态警告样式 */
.warning-section {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9 !important;
  border: 2px solid #333;
  border-radius: 4px;
  box-shadow: 2px 2px 0px #333;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.warning-item .warning-icon {
  font-size: 1.5em;
  margin-top: 2px;
}

.warning-item .warning-content {
  flex: 1;
}

.warning-item .warning-title {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 5px;
}

.warning-item .warning-text {
  font-size: 0.95em;
  line-height: 1.4;
}

.warning-item.reconnecting .spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #333;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.warning-item.critical {
  color: #d8000c;
  background-color: #ffdddd;
  border-color: #ffc1c1;
}

.warning-item.critical .warning-icon {
  color: #d8000c;
}
</style> 
