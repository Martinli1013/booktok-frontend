import { createRouter, createWebHistory } from 'vue-router';
import InputPage from '../components/InputPage.vue';
import ReportPage from '../components/ReportPage.vue';
import PrivacyPolicyPage from '../components/PrivacyPolicyPage.vue';
import TermsOfServicePage from '../components/TermsOfServicePage.vue';
// import RecentReportsModal from '../components/RecentReportsModal.vue'; // 如果你决定用模态框显示最近报告

const routes = [
  {
    path: '/',
    name: 'InputPage',
    component: InputPage,
  },
  {
    path: '/report/:reportId', // 假设报告通过ID访问
    name: 'ReportPage',
    component: ReportPage,
    props: true, // 将路由参数作为props传递给组件
  },
  {
    path: '/privacy-policy',
    name: 'PrivacyPolicyPage',
    component: PrivacyPolicyPage,
  },
  {
    path: '/terms-of-service',
    name: 'TermsOfServicePage',
    component: TermsOfServicePage,
  },
  // 处理未匹配的路由 - 重定向到首页
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
  // 如果 "最近生成的报告" 是一个单独的页面:
  // {
  //   path: '/recent-reports',
  //   name: 'RecentReportsPage',
  //   component: () => import('../components/RecentReportsPage.vue') // 懒加载示例
  // },
  // 如果你有一个专门的页面展示用户通过密钥兑换的积分等信息：
  // {
  // path: '/account',
  // name: 'AccountPage',
  // component: () => import('../components/AccountPage.vue')
  // },
  // 更多路由...
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // 滚动行为 - 每次路由切换时滚动到顶部
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// 添加导航守卫来处理移动端Safari的特殊情况
router.beforeEach((to, from, next) => {
  // 检测移动端Safari
  const isMobileSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
  
  if (isMobileSafari) {
    // 为移动端Safari添加一些特殊处理
    console.log('移动端Safari导航:', to.path);
  }
  
  next();
});

// 错误处理
router.onError((error) => {
  console.error('路由错误:', error);
  // 在移动端Safari出现路由错误时，尝试重新导航到首页
  const isMobileSafari = /iPhone|iPad|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
  if (isMobileSafari && error.message.includes('Navigation')) {
    window.location.href = '/';
  }
});

export default router; 