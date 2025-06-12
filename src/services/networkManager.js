/**
 * 网络连接管理器
 * 处理移动端页面切换、休眠等导致的连接问题
 */

class NetworkManager {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 初始延迟1秒
    this.maxRetryDelay = 10000; // 最大延迟10秒
    this.activeRequests = new Map(); // 跟踪活跃的请求
    this.pageVisible = true;
    
    this.initPageVisibilityListener();
    this.initNetworkStatusListener();
  }

  // 初始化页面可见性监听
  initPageVisibilityListener() {
    const handleVisibilityChange = () => {
      this.pageVisible = !document.hidden;
      
      if (this.pageVisible) {
        console.log('页面重新激活，检查待续传的请求');
        this.resumePendingRequests();
      } else {
        console.log('页面进入后台');
      }
    };

    // 标准的页面可见性API
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // iOS Safari 兼容性
    window.addEventListener('pagehide', () => {
      this.pageVisible = false;
    });
    
    window.addEventListener('pageshow', (event) => {
      this.pageVisible = true;
      if (event.persisted) {
        // 从缓存恢复的页面
        this.resumePendingRequests();
      }
    });
  }

  // 初始化网络状态监听
  initNetworkStatusListener() {
    window.addEventListener('online', () => {
      console.log('网络连接恢复');
      this.resumePendingRequests();
    });

    window.addEventListener('offline', () => {
      console.log('网络连接断开');
    });
  }

  // 带重试的fetch请求
  async fetchWithRetry(url, options = {}, requestId = null) {
    const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request = {
      url,
      options,
      requestId: id,
      attempts: 0,
      startTime: Date.now()
    };

    // 添加到活跃请求列表
    this.activeRequests.set(id, request);

    try {
      const response = await this.executeRequest(request);
      return response;
    } catch (error) {
      // 请求失败，从活跃列表中移除
      this.activeRequests.delete(id);
      throw error;
    }
  }

  // 执行请求（带重试逻辑）
  async executeRequest(request) {
    const { url, options, requestId } = request;
    
    try {
      // 检查网络状态
      if (!navigator.onLine) {
        throw new Error('网络连接不可用');
      }

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 请求成功，从活跃列表中移除
      this.activeRequests.delete(requestId);
      return response;

    } catch (error) {
      console.warn(`请求失败 (尝试 ${request.attempts + 1}/${this.retryAttempts}):`, error.message);
      
      request.attempts += 1;
      
      // 判断是否应该重试
      if (this.shouldRetry(error, request.attempts)) {
        const delay = this.calculateRetryDelay(request.attempts);
        console.log(`${delay}ms 后重试...`);
        
        await this.sleep(delay);
        return this.executeRequest(request);
      } else {
        // 重试次数用完，从活跃列表中移除
        this.activeRequests.delete(requestId);
        throw error;
      }
    }
  }

  // 判断是否应该重试
  shouldRetry(error, attempts) {
    if (attempts >= this.retryAttempts) {
      return false;
    }

    // 认证和客户端错误不应该重试
    const nonRetryableErrors = [
      'http 401',  // 认证失败
      'http 403',  // 权限不足
      'http 400',  // 请求错误
      'http 404',  // 资源不存在
      'http 422'   // 请求格式错误
    ];

    const errorMessage = error.message.toLowerCase();
    
    // 如果是不可重试的错误，直接返回false
    if (nonRetryableErrors.some(keyword => errorMessage.includes(keyword))) {
      return false;
    }

    // 网络相关错误应该重试
    const retryableErrors = [
      'Failed to fetch',
      'NetworkError',
      'AbortError',
      'TimeoutError',
      'network',
      'timeout',
      'abort',
      'http 5'  // 5xx服务器错误可以重试
    ];

    return retryableErrors.some(keyword => errorMessage.includes(keyword));
  }

  // 计算重试延迟（指数退避 + 随机抖动）
  calculateRetryDelay(attempts) {
    const baseDelay = this.retryDelay * Math.pow(2, attempts - 1);
    const jitter = Math.random() * 1000; // 0-1秒随机抖动
    return Math.min(baseDelay + jitter, this.maxRetryDelay);
  }

  // 睡眠函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 恢复待处理的请求
  async resumePendingRequests() {
    if (this.activeRequests.size === 0) {
      return;
    }

    console.log(`恢复 ${this.activeRequests.size} 个待处理请求`);
    
    const requests = Array.from(this.activeRequests.values());
    
    for (const request of requests) {
      // 检查请求是否已经超时
      const elapsed = Date.now() - request.startTime;
      if (elapsed > 60000) { // 1分钟超时
        console.log(`请求 ${request.requestId} 已超时，跳过`);
        this.activeRequests.delete(request.requestId);
        continue;
      }

      // 重置尝试次数，给新的机会
      request.attempts = 0;
      
      try {
        await this.executeRequest(request);
      } catch (error) {
        console.error(`恢复请求 ${request.requestId} 失败:`, error);
      }
    }
  }

  // 清理超时的请求
  cleanupRequests() {
    const now = Date.now();
    const expiredRequests = [];

    this.activeRequests.forEach((request, id) => {
      if (now - request.startTime > 300000) { // 5分钟超时
        expiredRequests.push(id);
      }
    });

    expiredRequests.forEach(id => {
      console.log(`清理超时请求: ${id}`);
      this.activeRequests.delete(id);
    });
  }

  // 获取网络状态信息
  getNetworkInfo() {
    return {
      online: navigator.onLine,
      pageVisible: this.pageVisible,
      activeRequests: this.activeRequests.size,
      // 如果支持网络信息API
      ...(navigator.connection && {
        connectionType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      })
    };
  }

  // 清理资源
  cleanup() {
    // 清理事件监听器
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('pagehide', this.handlePageHide);
    window.removeEventListener('pageshow', this.handlePageShow);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    // 清理活跃请求
    this.activeRequests.clear();
  }
}

// 创建全局实例
const networkManager = new NetworkManager();

// 定期清理超时请求
setInterval(() => {
  networkManager.cleanupRequests();
}, 60000); // 每分钟清理一次

export default networkManager; 