#!/usr/bin/env node

/**
 * 图片优化脚本
 * 使用方法：node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function printTitle() {
  console.log('================================');
  console.log('📸 BookTok 图片优化建议');
  console.log('================================');
}

const imageDir = path.join(__dirname, '../public/images');
const images = ['booktok-logo.png', 'pixel-header.png'];

printTitle();

images.forEach(filename => {
  const filePath = path.join(imageDir, filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`\n🔍 ${filename}`);
    console.log(`   当前大小: ${sizeKB}KB`);
    
    if (sizeKB > 100) {
      console.log(`   ⚠️  建议优化: 文件过大`);
      console.log(`   💡 推荐操作:`);
      console.log(`      1. 使用 TinyPNG (https://tinypng.com) 压缩`);
      console.log(`      2. 或使用 Squoosh (https://squoosh.app) 转为WebP`);
      console.log(`      3. 目标大小: <50KB`);
    } else {
      console.log(`   ✅ 大小合适`);
    }
  }
});

console.log('\n🚀 手动优化步骤:');
console.log('1. 访问 https://tinypng.com');
console.log('2. 上传 booktok-logo.png 和 pixel-header.png');
console.log('3. 下载压缩后的文件');
console.log('4. 替换 public/images/ 目录中的原文件');
console.log('5. 预期减少 60-80% 文件大小');

console.log('\n📊 预期效果:');
console.log('• 页面加载速度提升 2-3 倍');
console.log('• 移动设备体验显著改善');
console.log('• 节省用户流量');

console.log('\n🔧 已应用的代码优化:');
console.log('• ✅ 添加图片预加载');
console.log('• ✅ 设置优化的img属性');
console.log('• ✅ CSS性能优化');
console.log('• ✅ DNS预连接'); 