import { LLMSettings, LLMModel } from "../types";

export async function getAvailableModels(settings: LLMSettings): Promise<LLMModel[]> {
  const provider = settings.selectedProvider;
  const config = settings[provider];

  if (!config.apiKey) return [];

  try {
    if (provider === 'google') {
      return [
        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      ];
    } else if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      const data = await res.json();
      return data.data.map((m: any) => ({ id: m.id, name: m.id }));
    } else if (provider === 'openai') {
      const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
      const res = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      const data = await res.json();
      return data.data.map((m: any) => ({ id: m.id, name: m.id }));
    }
  } catch (e) {
    console.error("Failed to fetch models", e);
    return [];
  }
  return [];
}
