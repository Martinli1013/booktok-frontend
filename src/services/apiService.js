import { API_BASE_URL, API_KEY } from '../config';
import { reportState } from './reportState';
import networkManager from './networkManager';

// Keep a single worker instance
let reportWorker = null;
const isDevelopment = import.meta.env.MODE === 'development';

// The main function to generate a report using the Web Worker
function generateReport(bookDetails) {
  // Terminate any existing worker before starting a new one.
  if (reportWorker) {
    reportWorker.terminate();
  }

  // 1. Reset state
  reportState.isLoading = true;
  reportState.isPreviewing = true; // Start previewing immediately
  reportState.reportContent = '';
  reportState.error = null;
  reportState.isComplete = false;

  // 2. Create and configure the worker
  reportWorker = new Worker(new URL('../workers/reportGenerator.js', import.meta.url), {
    type: 'module'
  });

  reportWorker.onmessage = (event) => {
    const { type, content, error } = event.data;
    switch (type) {
      case 'update':
        reportState.reportContent += content;
        break;
      case 'done':
        reportState.isLoading = false;
        reportState.isComplete = true;
        reportWorker.terminate();
        reportWorker = null;
        break;
      case 'error':
        reportState.isLoading = false;
        reportState.error = error;
        reportWorker.terminate();
        reportWorker = null;
        break;
    }
  };

  reportWorker.onerror = (error) => {
    console.error('An error occurred in the report generator worker:', error);
    reportState.isLoading = false;
    reportState.error = error.message || 'An unexpected error occurred in the worker.';
    if (reportWorker) {
      reportWorker.terminate();
      reportWorker = null;
    }
  };

  // 3. Start the worker
  // FIX: Convert the reactive bookDetails object (Proxy) into a plain object
  // that can be cloned and sent to the Worker.
  const plainBookDetails = JSON.parse(JSON.stringify(bookDetails));

  reportWorker.postMessage({
    bookDetails: plainBookDetails,
    apiKey: API_KEY,
    apiBaseUrl: API_BASE_URL,
  });
}

function cancelReportGeneration() {
    if (reportWorker) {
        reportWorker.terminate();
        reportWorker = null;
        reportState.isLoading = false;
        reportState.isPreviewing = false;
        console.log('Report generation cancelled.');
    }
}

// RESTORED: Keep original function for resuming, but without worker
async function generateContinueReport(continueDetails) {
  if (isDevelopment) {
    console.log('Attempting to continue report generation with details:', {
      bookQuery: continueDetails.bookQuery,
      existingContentLength: continueDetails.existingContent?.length || 0
    });
    console.log('Using API Key:', API_KEY.substring(0, 10) + "..."); 
    console.log('Using API Base URL:', API_BASE_URL);
  }

  const requestData = {
    model: "deepseek-reasoner",
    messages: [
      {
        role: "user",
        content: continueDetails.continuePrompt
      }
    ],
    stream: true
  };

  if (isDevelopment) {
    console.log('Continue request data prepared');
  }

  try {
    // 使用网络管理器的fetchWithRetry方法
    const response = await networkManager.fetchWithRetry(`${API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'New-Api-User': '1',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (isDevelopment) {
      console.log('Continue stream response received successfully');
    }
    return response;

  } catch (error) {
    console.error('Continue API call failed:', error);
    throw error;
  }
}

// Exporting the new worker-based functions and old functions
export default {
  generateReport,
  cancelReportGeneration,
  generateContinueReport,

  // --- Other functions ---

  // 获取服务状态
  async getStatus() {
    try {
      const response = await networkManager.fetchWithRetry(`${API_BASE_URL}/api/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'New-Api-User': '1'
        },
      });
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get API status:', error);
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
};