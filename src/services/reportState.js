import { reactive } from 'vue';

export const reportState = reactive({
  isLoading: false,
  reportContent: '',
  error: null,
  isComplete: false,
  isPreviewing: false,
}); 