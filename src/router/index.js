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
});

export default router; 