import { z } from 'zod';

export enum Sender {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  DATA = 'data'
}

export interface WebProject {
  html: string;
  css: string;
  javascript: string;
}

export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
}

export type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'tool-invocation'; toolInvocation: ToolInvocation };

export interface Message {
  id: string;
  role: string;
  content: string;
  parts?: MessagePart[];
  timestamp?: number;
  project?: WebProject; 
}

export interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

export const CodeGenerationSchema = z.object({
  title: z.string(),
  description: z.string(),
  framework: z.enum(['react', 'html']).default('html'),
  libraries: z.array(z.string()).default(['lucide-react', 'framer-motion']),
  mainColor: z.string()
});

export type CodeGenerationConfig = z.infer<typeof CodeGenerationSchema>;

export interface PreviewState {
  project: WebProject | null;
  version: number;
  status: 'idle' | 'generating' | 'ready' | 'error';
}

// --- LLM Settings Types ---

export type LLMProvider = 'google' | 'groq' | 'openai';

export interface LLMModel {
  id: string;
  name: string;
}

export interface ProviderConfig {
    apiKey: string;
    model: string;
    baseUrl?: string; 
}

export interface LLMSettings {
  selectedProvider: LLMProvider;
  google: ProviderConfig;
  groq: ProviderConfig;
  openai: ProviderConfig;
}

export const DEFAULT_SETTINGS: LLMSettings = {
    selectedProvider: 'google',
    google: {
        apiKey: '',
        model: 'gemini-2.0-flash'
    },
    groq: {
        apiKey: '',
        model: 'llama-3.3-70b-versatile'
    },
    openai: {
        apiKey: '',
        model: 'gpt-4-turbo',
        baseUrl: 'https://api.openai.com/v1'
    }
};
