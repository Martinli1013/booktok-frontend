// Google Books API 服务
class GoogleBooksService {
  constructor() {
    // 注意：实际部署时需要获取真实的Google Books API Key
    // 当前使用测试配置，某些功能可能受限
    this.baseURL = 'https://www.googleapis.com/books/v1/volumes';
    this.apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || null;
    this.cache = new Map(); // 简单的内存缓存
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 搜索书籍
   * @param {string} query - 搜索关键词
   * @param {number} maxResults - 最大结果数量
   * @returns {Promise<Array>} 书籍列表
   */
  async searchBooks(query, maxResults = 8) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const cacheKey = `search_${query}_${maxResults}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      // 多重搜索策略提高中文搜索准确性
      const allBooks = await this.performMultipleSearches(query, maxResults);
      
      // 缓存结果
      this.cache.set(cacheKey, {
        data: allBooks,
        timestamp: Date.now()
      });

      return allBooks;
    } catch (error) {
      console.error('Google Books API 搜索失败:', error);
      
      // 如果是网络错误或API错误，返回空数组而不是抛出异常
      // 这样不会影响用户的正常输入体验
      return [];
    }
  }

  /**
   * 多重搜索策略
   * @param {string} query - 原始查询
   * @param {number} maxResults - 最大结果数
   * @returns {Promise<Array>} 去重后的书籍列表
   */
  async performMultipleSearches(query, maxResults) {
    const searches = [];
    const trimmedQuery = query.trim();

    // 1. 精确标题搜索
    searches.push(this.singleSearch(`intitle:"${trimmedQuery}"`, Math.ceil(maxResults / 2)));

    // 2. 如果是中文，尝试常见英文翻译
    const englishTitle = this.getEnglishTitle(trimmedQuery);
    if (englishTitle) {
      searches.push(this.singleSearch(`intitle:"${englishTitle}"`, Math.ceil(maxResults / 3)));
    }

    // 3. 普通搜索作为备用
    searches.push(this.singleSearch(trimmedQuery, Math.ceil(maxResults / 2)));

    // 执行所有搜索
    const results = await Promise.allSettled(searches);
    
    // 合并结果并去重
    const allBooks = [];
    const seenISBNs = new Set();
    const seenTitles = new Set();

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const book of result.value) {
          const key = book.isbn || book.title.toLowerCase();
          if (!seenISBNs.has(book.isbn) && !seenTitles.has(book.title.toLowerCase())) {
            allBooks.push(book);
            if (book.isbn) seenISBNs.add(book.isbn);
            seenTitles.add(book.title.toLowerCase());
          }
        }
      }
    }

    // 排序：精确匹配优先
    return allBooks
      .sort((a, b) => {
        const aExact = a.title.toLowerCase().includes(trimmedQuery.toLowerCase());
        const bExact = b.title.toLowerCase().includes(trimmedQuery.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      })
      .slice(0, maxResults);
  }

  /**
   * 单次搜索
   * @param {string} searchQuery - 搜索查询
   * @param {number} maxResults - 最大结果数
   * @returns {Promise<Array>} 书籍列表
   */
  async singleSearch(searchQuery, maxResults) {
    const encodedQuery = encodeURIComponent(searchQuery);
    let url = `${this.baseURL}?q=${encodedQuery}&maxResults=${maxResults}&orderBy=relevance`;
    
    if (this.apiKey) {
      url += `&key=${this.apiKey}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API Error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseBooks(data.items || []);
  }

  /**
   * 获取常见中文书籍的英文标题
   * @param {string} chineseTitle - 中文标题
   * @returns {string|null} 英文标题
   */
  getEnglishTitle(chineseTitle) {
    const titleMap = {
      '百年孤独': 'One Hundred Years of Solitude',
      '三体': 'The Three-Body Problem',
      '1984': '1984',
      '活着': 'To Live',
      '平凡的世界': 'Ordinary World',
      '红楼梦': 'Dream of the Red Chamber',
      '西游记': 'Journey to the West',
      '水浒传': 'Water Margin',
      '三国演义': 'Romance of the Three Kingdoms',
      '围城': 'Fortress Besieged',
      '许三观卖血记': 'Chronicle of a Blood Merchant',
      '兄弟': 'Brothers',
      '白夜行': 'Into the White Night',
      '解忧杂货店': 'The Miracles of the Namiya General Store',
      '挪威的森林': 'Norwegian Wood',
      '小王子': 'The Little Prince',
      '哈利波特': 'Harry Potter',
      '了不起的盖茨比': 'The Great Gatsby',
      '杀死一只知更鸟': 'To Kill a Mockingbird',
      '麦田里的守望者': 'The Catcher in the Rye',
      '追风筝的人': 'The Kite Runner',
      '偷书贼': 'The Book Thief',
      '摆渡人': 'The Ferryman'
    };

    return titleMap[chineseTitle] || null;
  }

  /**
   * 解析API返回的书籍数据
   * @param {Array} items - Google Books API返回的items
   * @returns {Array} 格式化的书籍列表
   */
  parseBooks(items) {
    return items
      .map(item => {
        const volumeInfo = item.volumeInfo || {};
        
        // 提取ISBN
        const isbn = this.extractISBN(volumeInfo.industryIdentifiers || []);
        
        // 确保有标题才返回
        if (!volumeInfo.title) {
          return null;
        }

        return {
          id: item.id,
          title: volumeInfo.title,
          subtitle: volumeInfo.subtitle || '',
          authors: volumeInfo.authors || ['未知作者'],
          publisher: volumeInfo.publisher || '',
          publishedDate: volumeInfo.publishedDate || '',
          isbn: isbn,
          description: this.truncateDescription(volumeInfo.description || ''),
          thumbnail: this.getHighQualityThumbnail(volumeInfo.imageLinks),
          categories: volumeInfo.categories || [],
          pageCount: volumeInfo.pageCount || 0,
          language: volumeInfo.language || 'zh'
        };
      })
      .filter(book => book !== null) // 过滤掉无效的书籍
      .slice(0, 8); // 确保不超过最大数量
  }

  /**
   * 提取ISBN
   * @param {Array} identifiers - 标识符数组
   * @returns {string} ISBN
   */
  extractISBN(identifiers) {
    // 优先返回ISBN_13，其次ISBN_10
    const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
    if (isbn13) return isbn13.identifier;
    
    const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
    if (isbn10) return isbn10.identifier;
    
    return '';
  }

  /**
   * 获取高质量缩略图
   * @param {Object} imageLinks - 图片链接对象
   * @returns {string} 图片URL
   */
  getHighQualityThumbnail(imageLinks) {
    if (!imageLinks) return '';
    
    // 按质量优先级选择图片
    return imageLinks.large || 
           imageLinks.medium || 
           imageLinks.small || 
           imageLinks.thumbnail || 
           imageLinks.smallThumbnail || 
           '';
  }

  /**
   * 截断描述文本
   * @param {string} description - 描述文本
   * @returns {string} 截断后的描述
   */
  truncateDescription(description) {
    if (!description) return '';
    
    // 移除HTML标签
    const plainText = description.replace(/<[^>]*>/g, '');
    
    // 截断到150个字符
    return plainText.length > 150 
      ? plainText.substring(0, 150) + '...' 
      : plainText;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 创建单例实例
const googleBooksService = new GoogleBooksService();

export default googleBooksService; 