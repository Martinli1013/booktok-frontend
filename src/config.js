// 强制在所有环境都使用生产API的URL。
// 后端已配置CORS和IP白名单，允许本地直接访问。
export const API_BASE_URL = 'https://booktok-newapi.onrender.com';

// 直接从环境变量中读取密钥。Vite会自动处理.env文件
export const API_KEY = import.meta.env.VITE_FRONTEND_ACCESS_TOKEN;

// 只在开发环境显示调试信息
if (import.meta.env.MODE === 'development') {
  console.log('--- Direct API Config ---');
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('API_KEY used:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'undefined');
  console.log('--------------------');
}