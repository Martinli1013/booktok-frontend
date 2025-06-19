<template>
  <div class="book-search-container">
    <div class="form-group">
      <label for="isbn-query">请输入ISBN：</label>
      <div class="search-input-wrapper" :class="{ 'has-suggestions': filteredSuggestions.length > 0 }">
        <input 
          type="text" 
          id="isbn-query"
          v-model="searchQuery"
          ref="searchInput"
          placeholder="请输入10位或13位ISBN码"
          class="form-input"
          :class="{ 'invalid-isbn': isInvalid }"
          :disabled="disabled"
          autocomplete="off"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        />
        
        <!-- 搜索状态指示器 -->
        <div v-if="isSearching" class="search-indicator">
          <div class="search-spinner"></div>
        </div>
        
        <!-- 清除按钮 -->
        <button 
          v-if="searchQuery && !disabled" 
          @click="clearSearch"
          @mousedown.prevent=""
          class="clear-button"
          type="button"
          title="清除输入"
        >
          ✕
        </button>
      </div>
      
      <!-- 搜索建议下拉列表 -->
      <div 
        v-if="showSuggestions && filteredSuggestions.length > 0" 
        class="suggestions-dropdown"
        :class="{ 'show': showSuggestions }"
      >
        <div 
          v-for="(book, index) in filteredSuggestions" 
          :key="book.id || index"
          @click="selectBook(book)"
          @mousedown.prevent=""
          class="suggestion-item"
          :class="{ 'highlighted': index === highlightedIndex }"
        >
          <div class="book-info">
            <div class="book-cover" v-if="book.thumbnail">
              <img :src="book.thumbnail" :alt="book.title" loading="lazy" />
            </div>
            <div class="book-details">
              <div class="book-title">{{ book.title }}</div>
              <div class="book-meta">
                <span class="book-authors">{{ formatAuthors(book.authors) }}</span>
                <span v-if="book.publishedDate" class="book-year">{{ extractYear(book.publishedDate) }}年</span>
              </div>
              <div class="book-isbn">ISBN: {{ book.isbn }}</div>
            </div>
          </div>
        </div>
        
        <!-- 无结果提示 -->
        <div v-if="searchQuery.length >= 10 && !isSearching && filteredSuggestions.length === 0" class="no-results">
          <div class="no-results-icon">📚</div>
          <div class="no-results-text">未找到相关书籍</div>
          <div class="no-results-tip">请检查ISBN码是否正确</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import googleBooksService from '../services/googleBooksService';

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'book-selected', 'search-change', 'clear']);

// 响应式数据
const searchQuery = ref(props.modelValue);
const searchInput = ref(null);
const suggestions = ref([]);
const isSearching = ref(false);
const showSuggestions = ref(false);
const highlightedIndex = ref(-1);
const searchTimeout = ref(null);
const selectedBook = ref(null);
const isInvalid = ref(false);

// 计算属性
const filteredSuggestions = computed(() => {
  return suggestions.value.slice(0, 5); // ISBN搜索最多显示5个建议
});

// 监听搜索查询变化
watch(searchQuery, (newValue) => {
  emit('update:modelValue', newValue);
  emit('search-change', newValue);
  
  // 如果是用户手动输入（不是选择建议），清除选中的书籍
  if (selectedBook.value && newValue !== selectedBook.value.isbn) {
    selectedBook.value = null;
  }
});

// 监听外部值变化
watch(() => props.modelValue, (newValue) => {
  if (newValue !== searchQuery.value) {
    searchQuery.value = newValue;
  }
});

// ISBN 验证函数
const isValidISBN = (isbn) => {
  const cleaned = isbn.replace(/-/g, '');
  return /^(?:\d{10}|\d{13})$/.test(cleaned);
};

// 防抖搜索函数
const debounceSearch = (query) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
  
  searchTimeout.value = setTimeout(async () => {
    await performSearch(query);
  }, 300); // 300ms 防抖
};

// 执行搜索
const performSearch = async (query) => {
  const trimmedQuery = query.trim();
  
  if (!isValidISBN(trimmedQuery)) {
    suggestions.value = [];
    showSuggestions.value = false;
    isInvalid.value = true;
    return;
  }
  isInvalid.value = false;
  
  try {
    isSearching.value = true;
    // 调用新的ISBN搜索方法
    const books = await googleBooksService.searchByISBN(trimmedQuery);
    suggestions.value = books;
    
    // 只有当输入框仍然聚焦时才显示建议
    if (document.activeElement === searchInput.value) {
      showSuggestions.value = books.length > 0;
    }
  } catch (error) {
    console.error('通过ISBN搜索书籍失败:', error);
    suggestions.value = [];
    showSuggestions.value = false;
  } finally {
    isSearching.value = false;
  }
};

// 事件处理函数
const handleInput = (event) => {
  let value = event.target.value;
  
  // 只允许输入数字和短横线
  value = value.replace(/[^0-9-]/g, '');
  
  searchQuery.value = value;
  highlightedIndex.value = -1;
  
  if (isValidISBN(value)) {
    isInvalid.value = false;
    debounceSearch(value);
  } else {
    isInvalid.value = value.length > 0;
    suggestions.value = [];
    showSuggestions.value = false;
  }
};

const handleFocus = () => {
  if (filteredSuggestions.value.length > 0) {
    showSuggestions.value = true;
  }
};

const handleBlur = () => {
  // 延迟隐藏，给点击事件时间执行
  setTimeout(() => {
    showSuggestions.value = false;
    highlightedIndex.value = -1;
  }, 200);
};

const handleKeydown = (event) => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) {
    return;
  }
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1, 
        filteredSuggestions.value.length - 1
      );
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
      break;
      
    case 'Enter':
      event.preventDefault();
      if (highlightedIndex.value >= 0) {
        selectBook(filteredSuggestions.value[highlightedIndex.value]);
      }
      break;
      
    case 'Escape':
      showSuggestions.value = false;
      highlightedIndex.value = -1;
      searchInput.value?.blur();
      break;
  }
};

const selectBook = (book) => {
  selectedBook.value = book;
  searchQuery.value = book.isbn; // 选择后，输入框显示ISBN
  showSuggestions.value = false;
  highlightedIndex.value = -1;
  isInvalid.value = false;
  
  // 发出选中事件，包含完整的书籍信息
  emit('book-selected', {
    title: book.title,
    author: formatAuthors(book.authors),
    isbn: book.isbn,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    fullBookInfo: book
  });
  
  nextTick(() => {
    searchInput.value?.blur();
  });
};

const clearSearch = () => {
  searchQuery.value = '';
  suggestions.value = [];
  showSuggestions.value = false;
  highlightedIndex.value = -1;
  selectedBook.value = null;
  isInvalid.value = false;
  emit('clear');
  nextTick(() => {
    searchInput.value?.focus();
  });
};

const focus = () => {
  searchInput.value?.focus();
}

defineExpose({ focus });

// 辅助函数
const formatAuthors = (authors) => {
  if (!authors || authors.length === 0) return '未知作者';
  if (authors.length > 2) {
    return `${authors[0]}, ${authors[1]} 等`;
  }
  return authors.join(', ');
};

const extractYear = (date) => {
  if (!date) return '';
  return new Date(date).getFullYear().toString();
};

const highlightMatch = (text, query) => {
  // ISBN搜索不需要高亮
  return text;
};

// 生命周期钩子
onMounted(() => {
  // 可以添加挂载时的逻辑
});

onUnmounted(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value);
  }
});

</script>

<style scoped>
.book-search-container {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input-wrapper.has-suggestions .form-input {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-color: transparent;
}

.form-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1.5;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.search-indicator {
  position: absolute;
  right: 35px;
  display: flex;
  align-items: center;
}

.search-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e1e5e9;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.clear-button {
  position: absolute;
  right: 10px;
  width: 20px;
  height: 20px;
  min-width: 20px;
  min-height: 20px;
  border: none;
  background: #9ca3af;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  line-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 0;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.clear-button:hover {
  background: #6b7280;
  transform: scale(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.clear-button:active {
  transform: scale(0.95);
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #007bff;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f1f3f4;
  transition: background-color 0.2s;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background-color: #f8f9fa;
}

.book-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.book-cover {
  flex-shrink: 0;
  width: 40px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  background: #f1f3f4;
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-details {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.book-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6c757d;
  margin-bottom: 2px;
}

.book-authors {
  font-weight: 500;
}

.book-year {
  color: #495057;
}

.book-isbn {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 4px;
}

/* 无结果提示样式 */
.no-results {
  padding: 20px;
  text-align: center;
  color: #6c757d;
}

.no-results-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.no-results-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.no-results-tip {
  font-size: 12px;
  color: #868e96;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-input {
    font-size: 16px; /* 防止iOS缩放 */
  }
  
  .suggestions-dropdown {
    max-height: 300px;
  }
  
  .book-info {
    gap: 8px;
  }
  
  .book-cover {
    width: 32px;
    height: 48px;
  }
}

.invalid-isbn {
  border-color: #e53e3e; /* 红色边框表示无效 */
  box-shadow: 0 0 0 1px #e53e3e;
}
</style> 