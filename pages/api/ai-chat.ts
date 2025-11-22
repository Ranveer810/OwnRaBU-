// pages/api/ai-chat.ts
import { createAIHandler, openai } from '@vercel/ai';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const aiHandler = createAIHandler({
  chat: openai({
    // Dynamic apiKey/model selection can be handled per request body
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo',
    maxTokens: 2048,
    // tool-calls/functions etc if defined
  })
});

export async function POST(req: NextRequest) {
  return aiHandler(req);
}
