<template>
  <div class="network-status" :class="statusClass">
    <div class="status-indicator">
      <div class="status-dot" :class="dotClass"></div>
      <span class="status-text">{{ statusText }}</span>
    </div>
    
    <div v-if="showDetails" class="status-details">
      <div class="detail-item">
        <span>网络: {{ networkInfo.online ? '在线' : '离线' }}</span>
      </div>
      <div class="detail-item">
        <span>页面: {{ networkInfo.pageVisible ? '活跃' : '后台' }}</span>
      </div>
      <div class="detail-item" v-if="networkInfo.activeRequests > 0">
        <span>活跃请求: {{ networkInfo.activeRequests }}</span>
      </div>
      <div class="detail-item" v-if="networkInfo.connectionType">
        <span>连接类型: {{ networkInfo.connectionType }}</span>
      </div>
    </div>
    
    <button
      v-if="showRetryButton"
      @click="retryRequests"
      class="retry-button"
      :disabled="isRetrying"
    >
      <svg class="retry-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"/>
      </svg>
      {{ isRetrying ? '重试中...' : '重试' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import networkManager from '../services/networkManager';

const props = defineProps({
  showDetails: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['retry-requests']);

const networkInfo = ref({
  online: true,
  pageVisible: true,
  activeRequests: 0,
  connectionType: null
});

const isRetrying = ref(false);

// 计算网络状态
const statusClass = computed(() => {
  if (!networkInfo.value.online) return 'status-offline';
  if (!networkInfo.value.pageVisible) return 'status-background';
  if (networkInfo.value.activeRequests > 0) return 'status-loading';
  return 'status-online';
});

const dotClass = computed(() => {
  if (!networkInfo.value.online) return 'dot-offline';
  if (!networkInfo.value.pageVisible) return 'dot-background';
  if (networkInfo.value.activeRequests > 0) return 'dot-loading';
  return 'dot-online';
});

const statusText = computed(() => {
  if (!networkInfo.value.online) return '网络断开';
  if (!networkInfo.value.pageVisible) return '页面后台';
  if (networkInfo.value.activeRequests > 0) return `请求中(${networkInfo.value.activeRequests})`;
  return '连接正常';
});

const showRetryButton = computed(() => {
  return !networkInfo.value.online || networkInfo.value.activeRequests > 0;
});

// 更新网络信息
const updateNetworkInfo = () => {
  networkInfo.value = networkManager.getNetworkInfo();
};

// 重试请求
const retryRequests = async () => {
  isRetrying.value = true;
  try {
    await networkManager.resumePendingRequests();
    emit('retry-requests');
  } catch (error) {
    console.error('重试请求失败:', error);
  } finally {
    isRetrying.value = false;
  }
};

let updateInterval;

onMounted(() => {
  // 初始化网络信息
  updateNetworkInfo();
  
  // 定期更新网络信息
  updateInterval = setInterval(updateNetworkInfo, 1000);
  
  // 监听网络状态变化
  window.addEventListener('online', updateNetworkInfo);
  window.addEventListener('offline', updateNetworkInfo);
  document.addEventListener('visibilitychange', updateNetworkInfo);
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  window.removeEventListener('online', updateNetworkInfo);
  window.removeEventListener('offline', updateNetworkInfo);
  document.removeEventListener('visibilitychange', updateNetworkInfo);
});
</script>

<style scoped>
.network-status {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  font-size: 14px;
  min-width: 160px;
  transition: all 0.3s ease;
}

.network-status:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.dot-online {
  background: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.2);
}

.dot-loading {
  background: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.2);
  animation: pulse 1.5s ease-in-out infinite;
}

.dot-background {
  background: #9e9e9e;
  box-shadow: 0 0 0 3px rgba(158, 158, 158, 0.2);
}

.dot-offline {
  background: #f44336;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.status-text {
  font-weight: 500;
  color: #333;
}

.status-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.detail-item {
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;
}

.retry-button:hover:not(:disabled) {
  background: #1976d2;
}

.retry-button:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
}

.retry-icon {
  width: 14px;
  height: 14px;
}

.status-offline {
  border-color: #f44336;
  background: #ffebee;
}

.status-background {
  border-color: #9e9e9e;
  background: #f5f5f5;
}

.status-loading {
  border-color: #ff9800;
  background: #fff3e0;
}

.status-online {
  border-color: #4caf50;
  background: #e8f5e8;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .network-status {
    top: 10px;
    right: 10px;
    padding: 10px 12px;
    font-size: 13px;
    min-width: 140px;
  }
  
  .retry-button {
    font-size: 11px;
    padding: 6px 10px;
  }
}
</style> 