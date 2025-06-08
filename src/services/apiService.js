import { API_BASE_URL, API_KEY } from '../config';
import networkManager from './networkManager';

export default {
  async generateReport(bookDetails) {
    console.log('Attempting to generate report with details:', bookDetails);
    console.log('Using API Key:', API_KEY.substring(0, 10) + "..."); 
    console.log('Using API Base URL:', API_BASE_URL);

    // 构建基础提示词
    let basePrompt = `我很喜欢《${bookDetails.bookQuery}》这本书，请根据以下结构，使用英文学术资料为依据，用中文生成一篇深度解读报告，目标总字数约 5000 字（最少不低于 3000 字），并且一次性输出全部内容，不得中途停止或询问是否继续。
**请确保分析的书籍是《${bookDetails.bookQuery}》，而不是其他任何虚构或相关主题的作品。**

整体结构必须包含以下这四个部分：

1. 作者简介（约200字）  
2. 章节概要（约2000字）
3. 核心主题（约1000字）
4. 主要人物（约300字）
5. 历史回响（约1000字）
6. 结语（约500字）

- 作者简介部分可以包括作者生平，写作动机，书名深意等。
- 主要人物部分可以包括人物简介，以及互相之间的关系，用表格形式展现。
- 历史回响部分可以包括社会图景，作品历史上的地位，以及对当世和后世的影响等。
- 每部分需要字数可以略有浮动，但整篇最终要在 3000-6000 字之间。

**注意：**
- 每一部分都请单独用 Markdown 二级标题标明，例如 "## 一、作者简介"。  
- 严格按照上面给的字数段分配，每部分写到接近规定字数。
- 确保你分析的是指定书名的作品，不要生成关于其他书籍的内容。
- 提供的内容必须真实准确，具有学术价值，不得编造虚假信息。
- 如果在搜索结果中没有找到关于《${bookDetails.bookQuery}》的信息，千万不要根据有限的资料自行进行创作。
- 不要给我进一步建议，也不需要为我提供任何其他价值。直接严格返回结果：“抱歉，我还没读过这本书…”即可。
- 分析应该专业深入，适合对该作品有一定了解的读者。
- 一次性输出全部内容，并确保整个文档的字数接近 5000 字
- 严格以书名《${bookDetails.bookQuery}》为准，不要搞错了书籍。`;

    const requestData = {
      model: "deepseek-reasoner",
      messages: [
        {
          role: "user",
          content: basePrompt
        }
      ],
      stream: true
    };

    console.log('Request data:', JSON.stringify(requestData, null, 2));

    try {
      // 使用网络管理器的fetchWithRetry方法
      const response = await networkManager.fetchWithRetry(`${API_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('Stream response received successfully');
      return response;

    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  },

  // 获取网络状态信息
  getNetworkInfo() {
    return networkManager.getNetworkInfo();
  },

  // 清理资源
  cleanup() {
    networkManager.cleanup();
  },

  // 获取服务状态
  async getStatus() {
    try {
      const response = await networkManager.fetchWithRetry(`${API_BASE_URL}/api/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get API status:', error);
      throw error;
    }
  }
};