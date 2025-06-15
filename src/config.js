export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://booktok-newapi.onrender.com';
export const API_KEY = import.meta.env.VITE_API_KEY || 'sk-X3xEM24rARBk8pUU6uiTfizXw7nu5qYFyBDpHOeb1XyMpec9'; // 使用有效的fallback密钥

// 只在开发环境显示调试信息
if (import.meta.env.MODE === 'development') {
  console.log('Config loaded - API_BASE_URL:', API_BASE_URL);
  console.log('Config loaded - API_KEY:', API_KEY.substring(0, 10) + '...');
}
