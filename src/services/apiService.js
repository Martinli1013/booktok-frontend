import axios from 'axios';
import { API_BASE_URL, API_KEY } from '../config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export default {
  generateReport(bookDetails) {
    // In a real scenario, bookDetails would be an object like:
    // { book_name: "The Lord of the Rings", author_name: "J.R.R. Tolkien", word_count: 5000 }
    // The endpoint '/api/generate-report' is hypothetical and needs to be defined in new-api
    // The actual request body structure will depend on what new-api expects.
    // For now, we'll make a call to a placeholder endpoint or a known one like /api/status
    // to demonstrate the connection.
    // Let's assume new-api might have an endpoint like '/v1/chat/completions'
    // which is common for OpenAI compatible APIs.

    console.log('Attempting to generate report with details:', bookDetails);
    console.log('Using API Key:', API_KEY);
    console.log('Using API Base URL:', API_BASE_URL);

    // This is a placeholder payload. You'll need to adjust this based on
    // the actual endpoint and expected request format of your `new-api`
    // and how it proxies requests to OpenAI.
    const payload = {
      model: 'deepseek-chat', // Changed to DeepSeek model
      messages: [
        {
          role: 'user',
          content: `我很喜欢《${bookDetails.bookQuery}》这本书。请你帮我起草一份深度解读报告，让我快速、全面、深刻的理解这本书中的所有重要观点和细节，请适当举例帮助我充分理解观点。
**请确保分析的是您输入的书籍《${bookDetails.bookQuery}》，而不是其他任何虚构或相关主题的作品。**

这份报告应面向普通读者，目标字数是 **10000 字**。请尽量接近这个字数。
请使用 Markdown 格式进行排版，并包含清晰的章节标题。

我是普通读者，但是读完书之后还是觉得理解有限，希望通过报告来加深我对本书的理解，各个层面、各个角度的理解，关键是让这本书的阅读对我这个普通读者产生更大的影响和触动。

要求：
1、使用英文搜索，只采纳英文资料（因为互联网上英文资料在数量和质量上都是最好的），用中文回答。
2、解读报告要细致，长度至少10000字。
3、解读深度是面向普通读者，而非学术批评。

请确保分析内容准确、深入，观点有见地，语言表达流畅易懂，适合普通读者阅读。
**再次强调，报告的目标字数是 10000 字，请务必努力达到。**`,
        },
      ],
      // stream: false, // Depending on if your new-api and frontend handle streaming
      // temperature: 0.7, // Example: Could add temperature if new-api supports it
    };

    // Using a generic OpenAI-compatible endpoint. Adjust if your new-api uses a different path.
    return apiClient.post('/v1/chat/completions', payload);
  },

  // You can add other API functions here, e.g., for getting user status, history, etc.
  getStatus() {
    return apiClient.get('/api/status'); // Assuming new-api has a /api/status endpoint
  }
}; 