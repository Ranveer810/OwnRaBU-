import { useChat } from '@ai-sdk/react';
import { useCallback } from 'react';

export function useAgent(projectManager: any, settings: any, consoleLogs: any) {
  const { messages, input, setInput, handleSubmit, isLoading, stop } = useChat({
    api: '/api/ai-chat',
    body: {
      settings,
      consoleLogs,
    },
    onFinish: (message) => {
      console.log('Agent finished:', message);
    },
  });

  const handleInputChange = useCallback((e: any) => {
    setInput(e.target.value);
  }, [setInput]);

  const stopGeneration = useCallback(() => {
    stop();
  }, [stop]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    stopGeneration,
    isLoading,
  };
}
