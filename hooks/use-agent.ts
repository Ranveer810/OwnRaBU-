import { useChat } from '@vercel/ai/react';

export function useAgent(projectManager, settings, consoleLogs) {
  // You may want to pass context such as project and settings to your /api/ai-chat endpoint
  const { messages, input, setInput, handleSubmit, isLoading } = useChat({
    api: '/api/ai-chat',
    body: {
      project: projectManager.project,
      settings,
      consoleLogs
    }
  });

  return {
    messages,
    input,
    handleInputChange: (e) => setInput(e.target.value),
    handleSubmit,
    isLoading
  };
}
