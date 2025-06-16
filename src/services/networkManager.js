/**
 * 网络连接管理器
 * 处理移动端页面切换、休眠等导致的连接问题
 */

class NetworkManager {
  /**
   * 带重试机制的fetch请求
   * @param {string} url - 请求URL
   * @param {object} options - fetch的配置选项
   * @param {number} retries - 重试次数
   * @returns {Promise<Response>}
   */
  async fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // 对于像4xx, 5xx这样的错误，直接抛出，由apiService处理
          const errorBody = await response.text();
          console.error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log(`Request to ${url} successful.`);
        return response; // 成功时直接返回响应

      } catch (error) {
        console.warn(`请求失败 (尝试 ${i + 1}/${retries}):`, error.message);
        if (i === retries - 1) {
          // 这是最后一次尝试，将错误向上抛出
          console.error('API call failed after all retries:', error);
          throw error;
        }
        // 等待一段时间再重试
        await new Promise(res => setTimeout(res, 1000 * (i + 1)));
      }
    }
  }
}

// 导出一个单例
const networkManager = new NetworkManager();
export default networkManager; 