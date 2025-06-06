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
        
        <!-- 页面可见性警告 -->
        <div v-if="showVisibilityWarning" class="visibility-warning">
          <div class="warning-icon">⚠️</div>
          <div class="warning-content">
            <h4>检测到页面切换</h4>
            <p>为确保最佳体验，建议保持页面在前台。</p>
            <p v-if="!navigator.onLine">网络连接已断开，请检查网络连接。</p>
            <p v-else-if="isReconnecting">正在尝试重新连接... ({{ connectionRetries }}/{{ maxRetries }})</p>
            <p v-else>返回页面时我们会自动恢复连接。</p>
          </div>
        </div>
        
        <!-- 重连状态 -->
        <div v-if="isReconnecting" class="reconnection-status">
          <div class="reconnect-spinner"></div>
          <p>连接中断，正在重新连接... (尝试 {{ connectionRetries }}/{{ maxRetries }})</p>
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
        <div class="error-actions">
          <button @click="resetForm" type="button" class="retry-btn">知道了，重试</button>
          <button 
            v-if="reportContent.length > 500" 
            @click="emergencyRecover" 
            type="button" 
            class="recover-btn"
          >
            紧急恢复 (已生成{{ Math.floor(reportContent.length / 100) }}00+字)
          </button>
        </div>
      </div>
    </form>

    <footer class="page-footer">
      <p>&copy; {{ currentYear }} Booktok. 保留所有权利。</p>
      <p><a href="/privacy-policy">隐私政策</a> | <a href="/terms-of-service">服务条款</a></p>
      <p class="version">版本 1.0.11</p>
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

// 配置常量
const CONFIG = {
  TARGET_LENGTH: 15000,
  INITIAL_DURATION: 25000,
  STREAMING_DURATION: 240000,
  FINAL_DURATION: 3000,
  RETRY_DELAY: 2000
};

// 计算属性
const currentYear = computed(() => new Date().getFullYear());

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

// 页面可见性管理
const handleVisibilityChange = () => {
  const wasVisible = isPageVisible.value;
  isPageVisible.value = !document.hidden;
  
  console.log('页面可见性变化:', isPageVisible.value ? '可见' : '隐藏');
  
  // 只在页面正在加载时处理可见性变化
  if (!isLoading.value) return;
  
  if (!isPageVisible.value) {
    // 页面隐藏时，只显示警告，不做其他操作
    showVisibilityWarning.value = true;
    console.log('检测到页面隐藏，显示警告');
  } else if (wasVisible === false && isPageVisible.value) {
    // 页面从隐藏变为可见
    showVisibilityWarning.value = false;
    console.log('页面重新可见');
    
    // 只有在确实有连接问题时才尝试重连
    if (connectionRetries.value > 0 && !isReconnecting.value) {
      console.log('检测到之前有连接问题，尝试恢复连接');
      setTimeout(() => attemptReconnection(), 1000); // 延迟1秒再重连
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
      return;
    }
    
    // 重新发起请求，从上次位置继续
    await continueFromLastPosition();
    
  } catch (err) {
    console.error('重连失败:', err);
    
    if (connectionRetries.value >= maxRetries.value) {
      error.value = `连接多次中断，已尝试重连${maxRetries.value}次。请刷新页面重新开始。`;
      cleanup();
    } else {
      // 继续尝试重连，但增加延迟
      console.log(`将在${CONFIG.RETRY_DELAY * connectionRetries.value}ms后再次尝试重连`);
      setTimeout(() => {
        if (isLoading.value && isPageVisible.value) {
          attemptReconnection();
        }
      }, CONFIG.RETRY_DELAY * connectionRetries.value);
    }
  } finally {
    isReconnecting.value = false;
  }
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
                  reportContent.value += parsed.choices[0].delta.content;
                  
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
  sessionId.value = null;
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

// 生命周期
onMounted(() => {
  bookQueryInput.value?.focus();
  
  // 添加页面可见性监听
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 添加网络状态监听
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
  
  console.log('页面可见性和网络状态监听已启动');
});

onUnmounted(() => {
  cleanup();
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  // 移除事件监听器
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleOnlineStatusChange);
  window.removeEventListener('offline', handleOnlineStatusChange);
  
  console.log('页面可见性和网络状态监听已清理');
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
</style> 
