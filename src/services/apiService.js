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
  async generateReport(bookDetails) {
    console.log('Attempting to generate report with details:', bookDetails);
    console.log('Using API Key:', API_KEY.substring(0, 10) + "..."); 
    console.log('Using API Base URL:', API_BASE_URL);

    // 构建基础提示词
    let basePrompt = `我很喜欢《${bookDetails.bookQuery}》这本书，请根据以下结构，使用英文学术资料为依据，用中文生成一篇深度解读报告，目标总字数约 10000 字（最少不低于 9000 字），并且一次性输出全部内容，不得中途停止或询问是否继续。
**请确保分析的书籍是《${bookDetails.bookQuery}》，而不是其他任何虚构或相关主题的作品。**

整体结构必须包含以下这四个部分：

1. 作者简介，写作动机和书名深意（至少1000字）  
2. 章节概要（至少2500字）
3. 核心主题（至少2500字）
4. 主要人物简介及关系（至少 1500字）
5. 社会图景与历史回响（至少1500字）
6. 艺术魅力（至少500字）
7. 结语（至少500字）

其他部分请根据作品内容自行发挥。每部分需要字数可以略有浮动，但整篇最终要接近 10000 字。

**注意：**
- 每一部分都请单独用 Markdown 二级标题标明，例如 "## 一、作者简介（约 1400 字）"。  
- 严格按照上面给的字数段分配，每部分写到接近对应字数即可，不要少写。  
- 在每一节末尾都**不要**写 "是否继续？"、"待续" 或任何分段提示；而是直接从下一部分接着写。  
- 最后一节写完后，请在报告末尾加上一段"全文字数统计"确认字数是否接近 10000（可以写：本文总字数约 X 字）。  
- 严格引用学术性英文源（可注明至少两三条参考文献，但不必在正文里标注具体页码）。  
- 绝不凭空杜撰，与《${bookDetails.bookQuery}》相关的引用必须来自已发表的权威译本或论文。  
- 用中文输出，行文流畅，面向普通读者。

现在，请根据上述要求，用 Markdown 格式撰写《${bookDetails.bookQuery}》深度解读报告。我是普通读者，读完书之后还是觉得理解有限，希望通过报告来加深我对本书的理解，各个层面、各个角度的理解，关键是让这本书的阅读对我这个普通读者产生更大的影响和触动。让我快速、全面、深刻的理解这本书中的所有重要观点和细节，请适当举例帮助我充分理解观点。

**一次性输出全部内容**，并确保整个文档的字数接近 10000 字。`;

    // 如果是断点续传，修改提示词
    if (bookDetails.continueFrom) {
      const contentLength = bookDetails.continueFrom.length;
      basePrompt = `之前我们在生成《${bookDetails.bookQuery}》的深度解读报告时中断了。以下是已经完成的内容（${contentLength}字）：

${bookDetails.continueFrom}

请从上述内容的断点处继续，完成剩余部分，确保：
1. 与之前内容自然衔接，不要重复已有内容
2. 继续按照原定结构完成报告
3. 保持同样的写作风格和深度
4. 确保最终总字数接近10000字
5. 如果已接近完成，请适当补充并加上结语和字数统计

请直接从断点处继续写作，无需重新开始：`;
    }

    const payload = {
      model: 'deepseek-reasoner',
      messages: [
        {
          role: 'user',
          content: basePrompt,
        },
      ],
      stream: true,
      // 添加会话标识（虽然后端可能不支持，但为将来扩展预留）
      ...(bookDetails.sessionId && { session_id: bookDetails.sessionId })
    };

    const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error("Error from API:", response.status, errorData);
      throw new Error(`API Error: ${response.status} ${errorData.message || 'Unknown error'}`);
    }

    return response; // Return the raw Response object
  },

  // You can add other API functions here, e.g., for getting user status, history, etc.
  getStatus() {
    return apiClient.get('/api/status'); // Assuming new-api has a /api/status endpoint
  }
}; 