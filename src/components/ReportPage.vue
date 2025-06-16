<template>
  <div class="report-page">
    <header class="page-header">
       <a href="/" class="back-link">&lt; 返回首页</a>
    </header>

    <div class="report-title">
      <h1>{{ bookTitle }}</h1>
    </div>

    <div class="report-actions-top">
      <button @click="adjustFontSize('increase')">字体增大</button>
      <button @click="adjustFontSize('decrease')">字体减小</button>
      <button @click="toggleLineHeight">行距切换</button>
      <button @click="toggleEyeCareMode">{{ eyeCareMode ? '关闭护眼' : '开启护眼' }}</button>
    </div>

    <div class="report-content-wrapper" :class="{ 'eye-care': eyeCareMode }" :style="contentStyle">
      <nav v-if="tableOfContents.length > 0" class="table-of-contents">
        <h2>目录</h2>
        <ul>
          <li v-for="item in tableOfContents" :key="item.id">
            <a :href="'#' + item.id" @click.prevent="scrollToSection(item.id)">{{ item.title }}</a>
          </li>
        </ul>
      </nav>

      <article class="report-body">
        <!-- 假设 reportHtml 是从API获取的包含锚点的HTML内容 -->
        <!-- 或者你可以用 markdown-it 这样的库来渲染Markdown -->
        <div v-if="reportHtml" v-html="reportHtml"></div>
        <div v-else-if="isLoadingReport">报告内容加载中... <div class="pixel-loader"></div></div>
        <div v-else class="error-message">无法加载报告内容。</div>
      </article>

      <aside v-if="visualizations.length > 0" class="visualizations-sidebar">
        <h2>可视化内容</h2>
        <div v-for="viz in visualizations" :key="viz.id" class="visualization-item">
          <h3>{{ viz.title }}</h3>
          <img :src="viz.imageUrl" :alt="viz.title" />
          <button @click="downloadVisualization(viz.imageUrl, viz.title)">下载图片</button>
        </div>
      </aside>
    </div>

    <!-- <div class="report-actions-bottom"> temporarily hidden
      <button @click="downloadReport('pdf')">下载PDF</button>
      <button @click="downloadReport('word')">下载Word</button>
      <button @click="sendReportByEmail">邮件发送</button>
      <button @click="shareReport">分享报告</button>
    </div> -->

    <footer class="page-footer">
       <p class="brand-watermark">报告由 BookTok 生成</p>
      <p>&copy; {{ new Date().getFullYear() }} BookTok. 保留所有权利。</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';

const reportHtml = ref('');
const bookTitle = ref(''); // 书名标题

// UI states (can keep these for styling)
const isLoadingReport = ref(true); // Will set to false once data is processed
const eyeCareMode = ref(false);
const currentFontSize = ref(16);
const currentLineHeight = ref(1.6);

// Remove mock tableOfContents and visualizations for now, as API doesn't provide them yet
const tableOfContents = ref([]);
const visualizations = ref([]);

const route = useRoute();

onMounted(() => {
  if (window.innerWidth <= 600) {
    currentFontSize.value = 13; // 移动端初始字号
  } else {
    currentFontSize.value = 16; // PC端初始字号
  }
  isLoadingReport.value = true;
  const reportId = route.params.reportId;
  const bookName = route.query.bookName || '未知书籍';
  
  // 设置书名标题
  bookTitle.value = bookName;

  console.log('ReportPage loaded for reportId:', reportId, 'Book Name:', bookName);

  const storedReportContent = localStorage.getItem(reportId); // CORRECT: Use reportId from route directly as the key

  if (storedReportContent) {
    try {
      reportHtml.value = marked(storedReportContent);
      //
      // We will attempt to generate a simple ToC from h2 and h3 tags in the Markdown
      // This is a basic implementation. For more complex scenarios, a more robust
      // Markdown parser and ToC generator would be needed.
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = reportHtml.value;
      const headings = tempDiv.querySelectorAll('h2, h3');
      const tocItems = [];
      headings.forEach((heading, index) => {
        const id = `section-${index}`;
        heading.id = id; // Add id to the heading itself for scrolling
        tocItems.push({
          id: id,
          title: heading.textContent,
          level: parseInt(heading.tagName.substring(1)) // h2 -> 2, h3 -> 3
        });
      });
      tableOfContents.value = tocItems;
      // Update reportHtml with the modified HTML that includes IDs for headings
      reportHtml.value = tempDiv.innerHTML;


    } catch (error) {
      console.error('Error parsing Markdown from localStorage:', error);
      reportHtml.value = '<p>无法解析报告内容，请检查存储的Markdown格式。</p>';
    }
  } else {
    reportHtml.value = '<p>未能从localStorage获取到报告内容。请返回重试。</p>';
    console.error('Report content not found in localStorage for reportId:', reportId);
  }
  isLoadingReport.value = false;
});

const contentStyle = computed(() => ({
  fontSize: `${currentFontSize.value}px`,
  lineHeight: currentLineHeight.value,
}));

const adjustFontSize = (type) => {
  if (type === 'increase') {
    currentFontSize.value += 1;
  } else if (type === 'decrease' && currentFontSize.value > 10) {
    currentFontSize.value -= 1;
  }
};

const toggleLineHeight = () => {
  currentLineHeight.value = currentLineHeight.value === 1.6 ? 2.0 : 1.6;
};

const toggleEyeCareMode = () => {
  eyeCareMode.value = !eyeCareMode.value;
};

const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const downloadVisualization = (imageUrl, title) => {
  console.log('下载可视化图片:', title, imageUrl);
  // 实现下载逻辑，例如创建一个a标签并模拟点击
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `${title.replace(/\s+/g, '_')}.png`; // 文件名
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadReport = (format) => {
  console.log('下载报告:', format);
  // TODO: 实现调用newapi下载报告的逻辑
};

const sendReportByEmail = () => {
  console.log('邮件发送报告');
  // TODO: 实现调用newapi发送邮件的逻辑
};

const shareReport = () => {
  console.log('分享报告');
  // TODO: 实现分享逻辑 (例如复制链接到剪贴板, 或调用Web Share API)
};

</script>

<style scoped>
/* 强制浅色模式，防止系统深色模式干扰 */
/* 全局深色模式防护 */
@media (prefers-color-scheme: dark) {
  .report-page, .report-page * {
    color-scheme: light !important;
  }
}
.report-page {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif; /* 稍后替换为像素字体 */
  background-color: #f9f9f9 !important;
  border: 2px solid #333;
  color: #333 !important;
  color-scheme: light !important; /* 强制浅色模式 */
}

.page-header {
  text-align: left; /* Changed from center to left for backlink */
  margin-bottom: 20px;
  padding-bottom: 10px; /* Reduced padding slightly */
  border-bottom: 2px solid #ccc;
  position: relative;
  min-height: 2em; /* Ensure space for backlink even if title is removed */
}
.back-link {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    color: #007bff !important;
    text-decoration: none;
    font-size: 0.85em;
}

.report-title {
  text-align: center;
  margin-bottom: 25px;
  padding: 20px;
  background-color: #fff !important;
  border: 2px solid #333;
  box-shadow: 4px 4px 0px #333;
  border-radius: 0;
}

.report-title h1 {
  margin: 0;
  font-size: 2.2em;
  color: #333 !important;
  font-weight: bold;
  letter-spacing: 1px;
  text-shadow: 2px 2px 0px #ddd;
  font-family: sans-serif;
}

.report-actions-top, .report-actions-bottom {
  margin-bottom: 20px;
  text-align: center;
}
.report-actions-top button, .report-actions-bottom button {
  margin: 5px;
  padding: 8px 12px;
  background-color: #e0e0e0 !important;
  border: 1px solid #333;
  cursor: pointer;
  color: #333 !important;
}
.report-actions-top button:hover, .report-actions-bottom button:hover {
  background-color: #d0d0d0 !important;
}

.report-content-wrapper {
  display: flex;
  gap: 20px;
  transition: background-color 0.3s, color 0.3s;
}
.report-content-wrapper.eye-care {
  background-color: #c9e4c9; /* 示例护眼色 */
  color: #222; /* 护眼模式下的文字颜色 */
}

.table-of-contents {
  flex: 0 0 200px; /* 目录固定宽度 */
  padding-right: 15px;
  border-right: 1px solid #ddd;
}
.table-of-contents h2 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 1.3em; 
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
  text-align: left; /* Ensure H2 is left-aligned */
}
.table-of-contents ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
  text-align: left; /* Ensure list items are left-aligned */
}
.table-of-contents li a {
  text-decoration: none;
  color: #007bff !important;
  display: block;
  padding: 5px 0;
}
.table-of-contents li a:hover {
  text-decoration: underline;
}

.report-body {
  flex-grow: 1;
  text-align: left; /* Default text alignment for all content within report-body */
  /* Basic styling for Markdown content */
  /* It's good practice to set a base font family for the report body if not already on .report-page */
  /* font-family: 'YourPixelFont', monospace; */ /* Uncomment and replace YourPixelFont */
}

/* Deep selectors for elements generated by v-html from Markdown */
:deep(.report-body > h1:first-child),
:deep(.report-body > h2:first-child) { /* Target first h1 or h2 as main title */
  text-align: center; /* Center the main report title */
  font-size: 1.8em; /* Adjust as needed, example size */
  margin-bottom: 1.5em; /* More space after main title */
}

:deep(.report-body h1) { /* Subsequent H1s if any */
  font-size: 1.6em; /* Adjust relative to base contentStyle.fontSize */
  color: #333333 !important;
  margin-top: 1.5em;
  margin-bottom: 0.7em;
}

:deep(.report-body h2) {
  font-size: 1.75em;
  /* Example: scroll-margin-top for ToC linking */
  scroll-margin-top: 20px; 
}

:deep(.report-body h3) {
  font-size: 1.5em;
  scroll-margin-top: 20px;
}

:deep(.report-body h4) {
  font-size: 1.25em;
  scroll-margin-top: 20px;
}

:deep(.report-body p) {
  margin-bottom: 1em;
  /* line-height is controlled by contentStyle, so no need to repeat unless specific override */
}

:deep(.report-body ul),
:deep(.report-body ol) {
  margin-bottom: 1em;
  padding-left: 2em; /* Standard indentation for lists */
}

:deep(.report-body li) {
  margin-bottom: 0.5em;
}

:deep(.report-body blockquote) {
  margin-left: 0;
  padding-left: 1.5em;
  border-left: 3px solid #ccc; /* Common blockquote style */
  color: #555 !important;
  font-style: italic;
  margin-bottom: 1em;
}

:deep(.report-body pre) {
  background-color: #2d2d2d; /* Dark background for code blocks */
  color: #f0f0f0; /* Light text for code blocks */
  padding: 1em;
  overflow-x: auto; /* Allow horizontal scrolling for long code lines */
  border-radius: 0; /* Sharp edges for pixel style */
  border: 1px solid #444;
  margin-bottom: 1em;
  font-family: 'Courier New', Courier, monospace; /* Monospace font for code */
}

:deep(.report-body code) {
  /* Inline code */
  font-family: 'Courier New', Courier, monospace;
  background-color: #e0e0e0 !important;
  color: #333 !important;
  padding: 0.2em 0.4em;
  border-radius: 0;
  font-size: 0.9em;
}
:deep(.report-body pre code) {
  /* Code inside pre block - remove inline styling */
  background-color: transparent;
  padding: 0;
  font-size: inherit; /* Inherit from pre */
}

:deep(.report-body hr) {
  border: none;
  border-top: 2px solid #555; /* Pixel-style horizontal rule */
  margin-top: 1.5em;
  margin-bottom: 1.5em;
}

:deep(.report-body a) {
  color: #007bff !important; /* Standard link color, can be themed */
  text-decoration: none;
}
:deep(.report-body a:hover) {
  text-decoration: underline;
}

/* Example of no font smoothing - can make pixel fonts sharper but browser support varies */
/*
:deep(.report-body *) {
  font-smooth: never;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale; 
}
*/

/* Pixel-art style for tables */
:deep(.report-body table) {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
  margin-bottom: 1em;
  border: 2px solid #333; /* Pixel border for the table */
  box-shadow: 2px 2px 0px #333; /* Pixel shadow for the table */
  background-color: #fff; /* Background for table content area */
}

:deep(.report-body th),
:deep(.report-body td) {
  border: 2px solid #333; /* Pixel border for cells */
  padding: 8px;
  text-align: left;
}

:deep(.report-body th) {
  background-color: #e0e0e0; /* Light gray background for headers, pixel-style */
  color: #333;
  font-weight: bold;
}

/* Ensure no double borders between cells due to collapse */
:deep(.report-body tr:not(:first-child) th),
:deep(.report-body tr:not(:first-child) td) {
  border-top: 0; 
}
:deep(.report-body th:not(:first-child)),
:deep(.report-body td:not(:first-child)) {
  border-left: 0;
}

.visualizations-sidebar {
  flex: 0 0 220px; /* Sidebar fixed width */
  padding-left: 15px;
  border-left: 1px solid #ddd;
}
.visualizations-sidebar h2 {
  margin-top: 0;
  font-size: 1.2em;
}
.visualization-item {
  margin-bottom: 15px;
}
.visualization-item img {
  max-width: 100%;
  height: auto;
  border: 1px solid #ccc;
  margin-bottom: 5px;
}
.visualization-item button {
  font-size: 0.9em;
  padding: 5px 8px;
}

.loading-indicator, .error-message {
  margin-top: 20px;
  padding: 15px;
  border: 2px solid #333;
  text-align: center;
}

.loading-indicator {
  background-color: #e0e0e0;
}
.pixel-loader { /* 与InputPage共用 */
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

.error-message {
  background-color: #ffdddd;
  color: #d8000c;
}

.page-footer {
  margin-top: 40px;
  text-align: center;
  font-size: 0.9em;
  color: #555;
  border-top: 2px solid #333;
  padding-top: 15px;
}
.brand-watermark {
    font-style: italic;
    color: #777;
    margin-bottom: 10px;
}

@media (max-width: 600px) {
  /* 移动端时设置整个页面背景为灰色 */
  html, body {
    background-color: #f9f9f9 !important;
  }
  
  .report-page {
    max-width: 100%;
    width: 100%;
    padding: 8px;
    border: none;
    box-shadow: none;
    margin: 0;
    min-height: 100vh;
    background-color: #f9f9f9 !important;
    box-sizing: border-box;
  }
  .page-header {
    padding-bottom: 4px;
    min-height: 1.5em;
  }
  .report-title {
    margin-bottom: 15px;
    padding: 15px 10px;
    border-width: 1px;
    box-shadow: 2px 2px 0px #333;
    width: 100%;
    box-sizing: border-box;
  }
  .report-title h1 {
    font-size: 1.6em;
    letter-spacing: 0.5px;
    text-shadow: 1px 1px 0px #ddd;
    line-height: 1.3;
  }
  .report-actions-top {
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    gap: 6px;
    margin-bottom: 16px;
  }
  .report-actions-top button {
    flex: 1 1 0;
    min-width: 0;
    font-size: 0.7em;
    padding: 5px 0;
    margin: 0;
    box-sizing: border-box;
    border-radius: 4px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 2px 2px 0px #333;
  }
  .report-content-wrapper {
    flex-direction: column !important;
    gap: 8px;
    padding: 0;
    width: 100%;
    box-sizing: border-box;
  }
  .table-of-contents {
    flex: none;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #ddd;
    padding-right: 0;
    margin-bottom: 10px;
    box-sizing: border-box;
  }
  .table-of-contents h2 {
    font-size: 1.1em;
    padding-bottom: 2px;
  }
  .table-of-contents ul {
    font-size: 1em;
  }
  .report-body {
    padding: 0;
    font-size: 1em;
    width: 100%;
    box-sizing: border-box;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .visualizations-sidebar {
    flex: none;
    width: 100%;
    border-left: none;
    border-top: 1px solid #ddd;
    padding-left: 0;
    margin-top: 10px;
  }
  .brand-watermark {
    font-size: 0.9em;
  }
  .page-footer {
    font-size: 0.85em;
    padding-top: 8px;
  }
  
  /* 移动端内容防溢出 */
  :deep(.report-body *) {
    max-width: 100%;
    box-sizing: border-box;
  }
  
  :deep(.report-body pre) {
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
  
  :deep(.report-body table) {
    width: 100%;
    table-layout: fixed;
  }
}

@media (max-width: 350px) {
  .report-actions-top button {
    font-size: 0.6em;
    height: 20px;
    padding: 3px 0;
  }
  .report-title {
    padding: 12px 8px;
  }
  .report-title h1 {
    font-size: 1.4em;
    letter-spacing: 0.3px;
  }
}
</style>

<!-- 移动端全局背景色设置（不受scoped限制） -->
<style>
@media (max-width: 600px) {
  html, body {
    background-color: #f9f9f9 !important;
    overflow-x: hidden;
    width: 100%;
    margin: 0;
    padding: 0;
  }
  
  #app {
    background-color: #f9f9f9 !important;
    width: 100%;
    overflow-x: hidden;
  }
}
</style> 