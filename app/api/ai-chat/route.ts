import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const runtime = 'edge';

const SYSTEM_INSTRUCTION = `You are Zenith, an expert Frontend AI Coding Agent.
Your goal is to help users build beautiful, functional, and modern websites using HTML, CSS, and JavaScript.

CAPABILITIES:
- read_files: Read the current content of the files
- update_file: Completely replace the content of a single file
- patch_file: Replace a specific part of a file using search and replace
- screenshot_website: Capture a visual screenshot
- validate_functionality: Run an automated test script
- read_console_logs: Read browser console logs

RULES:
- Always strive for modern, responsive designs using Tailwind CSS
- When the user asks to change something small, PREFER using patch_file
- When using patch_file, ensure the search_string matches EXACTLY
- If the user mentions an error, check the console logs first`;

export async function POST(req: Request) {
  const { messages, settings, consoleLogs } = await req.json();

  const provider = settings?.selectedProvider || 'google';
  const apiKey = settings?.[provider]?.apiKey;
  const modelId = settings?.[provider]?.model || 'gemini-1.5-flash';

  let model;
  if (provider === 'google') {
    model = google(modelId, { apiKey });
  } else if (provider === 'openai') {
    model = openai(modelId, { apiKey });
  } else if (provider === 'groq') {
    model = openai(modelId, {
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  } else {
    model = google('gemini-1.5-flash');
  }

  const result = await streamText({
    model,
    system: SYSTEM_INSTRUCTION,
    messages,
    tools: {
      read_files: tool({
        description: 'Read the full content of the current project files.',
        parameters: z.object({}),
        execute: async () => {
          return {
            status: 'success',
            message: 'Files read successfully',
            files: { html: '', css: '', javascript: '' }
          };
        },
      }),
      update_file: tool({
        description: 'Completely replace the content of a single file',
        parameters: z.object({
          target: z.enum(['html', 'css', 'javascript']),
          content: z.string(),
        }),
        execute: async ({ target, content }) => {
          return {
            status: 'success',
            message: `Updated ${target} file`,
          };
        },
      }),
      patch_file: tool({
        description: 'Replace a specific segment of code within a file',
        parameters: z.object({
          target: z.enum(['html', 'css', 'javascript']),
          search_string: z.string(),
          replacement_string: z.string(),
        }),
        execute: async ({ target, search_string, replacement_string }) => {
          return {
            status: 'success',
            message: `Patched ${target} file`,
          };
        },
      }),
      screenshot_website: tool({
        description: 'Take a visual screenshot of the current rendered website',
        parameters: z.object({}),
        execute: async () => {
          return {
            status: 'success',
            message: 'Screenshot captured',
          };
        },
      }),
      validate_functionality: tool({
        description: 'Execute a JavaScript test script against the current website',
        parameters: z.object({
          test_script: z.string(),
        }),
        execute: async ({ test_script }) => {
          return {
            status: 'success',
            message: 'Test executed',
          };
        },
      }),
      read_console_logs: tool({
        description: 'Read the browser console logs',
        parameters: z.object({}),
        execute: async () => {
          return {
            status: 'success',
            logs: consoleLogs || [],
          };
        },
      }),
    },
    maxToolRoundtrips: 5,
  });

  return result.toDataStreamResponse();
}
