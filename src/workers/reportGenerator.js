/**
 * reportGenerator.js
 * This script runs in a Web Worker.
 * It is responsible for making the API call to generate a book report
 * and streaming the results back to the main application thread.
 */

self.onmessage = async (event) => {
  const { bookDetails, apiKey, apiBaseUrl } = event.data;

  // 1. Reconstruct the basePrompt exactly as in apiService.js
  let basePrompt;
  const bookTitle = bookDetails.bookInfo ? bookDetails.bookInfo.title : bookDetails.bookQuery;
  const author = bookDetails.bookInfo ? bookDetails.bookInfo.author : 'the author';
  const isbn = bookDetails.bookInfo ? bookDetails.bookInfo.isbn : null;

  if (bookDetails.bookInfo && bookDetails.bookInfo.title && bookDetails.bookInfo.author) {
    const isbnText = isbn ? `（ISBN: ${isbn}）` : '';
    basePrompt = `我很喜欢${author}写的《${bookTitle}》${isbnText}这本书，请根据以下结构，使用英文学术资料为依据，用中文生成一篇深度解读报告，目标总字数约 5000 字（最少不低于 3000 字），并且一次性输出全部内容，不得中途停止或询问是否继续。

**请确保分析的书籍是${author}创作的《${bookTitle}》${isbnText}，而不是其他任何同名或相关主题的作品。**

整体结构必须包含以下这四个部分：

1. 作者简介  
2. 章节概要
3. 核心主题
4. 主要人物
5. 历史回响
6. 名句赏析
7. 结语

- 作者简介部分约200字。可以包括作者生平，写作动机，书名深意等。
- 章节概要部分约2000字。
- 核心主题部分约1000字。
- 主要人物部分约300字。可以包括人物简介，以及互相之间的关系，用表格形式展现。
- 历史回响部分约1000字。可以包括社会图景，作品历史上的地位，以及对当世和后世的影响等。
- 名句赏析部分约400字。请选出书中最有代表性的三句金句进行赏析。
- 结语部分约200字。
- 每部分需要字数可以略有浮动，但整篇最终要在 3000-6000 字之间。

**注意：**
- 每一部分都请单独用 Markdown 二级标题标明，例如 "## 一、作者简介"。  
- 严格按照上面给的字数段分配，每部分写到接近规定字数。
- 确保你分析的是指定书名的作品，不要生成关于其他书籍的内容。
- 提供的内容必须真实准确，具有学术价值，不得编造虚假信息。
- 如果在搜索结果中没有找到关于《${bookTitle}》的信息，千万不要根据有限的资料自行进行创作。
- 不要给我进一步建议，也不需要为我提供任何其他价值。直接严格返回结果："抱歉，我还没读过这本书…"即可。
- 分析应该专业深入，适合对该作品有一定了解的读者。
- 一次性输出全部内容，并确保整个文档的字数接近 5000 字
- 严格以书名《${bookTitle}》为准，不要搞错了书籍。`;
  } else {
    basePrompt = `我很喜欢《${bookDetails.bookQuery}》这本书，请根据以下结构，使用英文学术资料为依据，用中文生成一篇深度解读报告，目标总字数约 5000 字（最少不低于 3000 字），并且一次性输出全部内容，不得中途停止或询问是否继续。
**请确保分析的书籍是《${bookDetails.bookQuery}》，而不是其他任何虚构或相关主题的作品。**

整体结构必须包含以下这四个部分：

1. 作者简介  
2. 章节概要
3. 核心主题
4. 主要人物
5. 历史回响
6. 名句赏析
7. 结语

- 作者简介部分约200字。可以包括作者生平，写作动机，书名深意等。
- 章节概要部分约2000字。
- 核心主题部分约1000字。
- 主要人物部分约300字。可以包括人物简介，以及互相之间的关系，用表格形式展现。
- 历史回响部分约1000字。可以包括社会图景，作品历史上的地位，以及对当世和后世的影响等。
- 名句赏析部分约400字。请选出书中最有代表性的三句金句进行赏析。
- 结语部分约200字。
- 每部分需要字数可以略有浮动，但整篇最终要在 3000-6000 字之间。

**注意：**
- 每一部分都请单独用 Markdown 二级标题标明，例如 "## 一、作者简介"。  
- 严格按照上面给的字数段分配，每部分写到接近规定字数。
- 确保你分析的是指定书名的作品，不要生成关于其他书籍的内容。
- 提供的内容必须真实准确，具有学术价值，不得编造虚假信息。
- 如果在搜索结果中没有找到关于《${bookDetails.bookQuery}》的信息，千万不要根据有限的资料自行进行创作。
- 不要给我进一步建议，也不需要为我提供任何其他价值。直接严格返回结果："抱歉，我还没读过这本书…"即可。
- 分析应该专业深入，适合对该作品有一定了解的读者。
- 一次性输出全部内容，并确保整个文档的字数接近 5000 字
- 严格以书名《${bookDetails.bookQuery}》为准，不要搞错了书籍。`;
  }

  // 2. Build the request data
  const requestData = {
    model: "deepseek-reasoner",
    messages: [{
      role: "user",
      content: basePrompt
    }],
    stream: true
  };

  try {
    // 3. Perform the fetch call
    const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'New-Api-User': '1',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 4. Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let partialData = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      partialData += chunk;

      const events = partialData.split('\n\n');
      partialData = events.pop(); // Keep incomplete event part

      for (const event of events) {
        if (event.startsWith('data: ')) {
          const dataContent = event.substring(6).trim();

          if (dataContent === '[DONE]') {
            continue; // End of stream signal
          }
          
          try {
            const parsed = JSON.parse(dataContent);
            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              const text = parsed.choices[0].delta.content;
              // 5. Post message back to main thread
              self.postMessage({ type: 'update', content: text });
            }
          } catch (e) {
             console.error('Worker: Error parsing SSE event data:', e, 'Raw data:', `"${dataContent}"`);
          }
        }
      }
    }
    // 6. Signal completion
    self.postMessage({ type: 'done' });
  } catch (error) {
    console.error('Worker: API call failed:', error);
    // 7. Signal error
    self.postMessage({ type: 'error', error: error.message });
  } finally {
    self.close(); // Close the worker to free up resources
  }
}; 