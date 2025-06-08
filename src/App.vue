<template>
  <div id="app-container">
    <router-view />
  </div>
</template>

<script setup>
import { onUnmounted } from 'vue';
import apiService from './services/apiService';

// 页面卸载时清理资源
onUnmounted(() => {
  apiService.cleanup();
});
</script>

<style scoped>
#app-container {
  min-height: 100vh;
  position: relative;
}
</style> 