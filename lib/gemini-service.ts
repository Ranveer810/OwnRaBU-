import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Tool, Type } from "@google/genai";
import { Message, Sender, ToolInvocation } from "../types";

// Initialize the client with the API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are Zenith, an expert Frontend AI Coding Agent.
Your goal is to help users build beautiful, functional, and modern websites using HTML, CSS, and JavaScript.

CAPABILITIES:
1. **generate_new_project**: Create a full new project from scratch (index.html, styles.css, script.js).
2. **read_files**: Read the current content of the files. Use this whenever you need to understand the current code state before answering questions or making edits.
3. **update_file**: COMPLETELY replace the content of a specific file (html, css, or javascript).
4. **patch_file**: INTELLIGENTLY replace a specific part of a file using search and replace strings. Use this for small edits to avoid rewriting the whole file.
5. **screenshot_website**: Capture a visual screenshot of the current website project. Use this when you need to check for layout issues, colors, or visual bugs, or when the user asks you to "look" at the site.
6. **validate_functionality**: Run an automated test script on the current website to verify functionality. Use this when the user asks to "test" the site or when you want to verify your own code works.

RULES:
- Always strive for modern, responsive designs using Tailwind CSS.
- When the user asks to change something small (e.g., "change button color"), PREFER using \`patch_file\`.
- When the user asks for a major overhaul, use \`update_file\` or \`generate_new_project\`.
- When using \`patch_file\`, ensure the \`search_string\` matches EXACTLY what is in the code, including whitespace.
- 'index.html' must be a complete HTML5 structure.

TESTING RULES:
- When using \`validate_functionality\`, write a clean JavaScript code block.
- The script runs inside the browser context of the generated website.
- Throw an Error if the test fails.
- Return (or let finish) if the test passes.
- Example: "const btn = document.querySelector('button'); if(!btn) throw new Error('Button missing'); btn.click();"
`;

// Tool Definitions
const toolsDef: Tool[] = [{
  functionDeclarations: [
    {
      name: "read_files",
      description: "Read the full content of the current project files (index.html, styles.css, script.js). Use this to inspect the code.",
    },
    {
      name: "update_file",
      description: "Completely replace the content of a single file",
      parameters: {
        type: Type.OBJECT,
        properties: {
          target: { type: Type.STRING, enum: ["html", "css", "javascript"], description: "The file to update" },
          content: { type: Type.STRING, description: "The full new content of the file" }
        },
        required: ["target", "content"]
      }
    },
    {
      name: "patch_file",
      description: "Replace a specific segment of code within a file",
      parameters: {
        type: Type.OBJECT,
        properties: {
          target: { type: Type.STRING, enum: ["html", "css", "javascript"], description: "The file to patch" },
          search_string: { type: Type.STRING, description: "The exact code segment to find and replace" },
          replacement_string: { type: Type.STRING, description: "The new code to insert in place of the search string" }
        },
        required: ["target", "search_string", "replacement_string"]
      }
    },
    {
      name: "screenshot_website",
      description: "Take a visual screenshot of the current rendered website project to analyze the UI.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
        required: []
      }
    },
    {
      name: "validate_functionality",
      description: "Execute a JavaScript test script against the current website to verify functionality.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          test_script: { type: Type.STRING, description: "JavaScript code that asserts conditions. Throw an Error if the test fails." }
        },
        required: ["test_script"]
      }
    }
  ]
}];

type StreamChunk = {
  text?: string;
  toolCall?: ToolInvocation;
  toolResult?: { toolCallId: string; result: any };
};

export async function* streamGeminiChat(
  history: Message[],
  newMessage: string,
  toolExecutor: (name: string, args: any) => Promise<any>
): AsyncGenerator<StreamChunk, void, unknown> {
  
  const chatHistory = history
    .filter((msg) => msg.role !== Sender.SYSTEM)
    .map((msg) => {
      return {
        role: msg.role === Sender.USER ? "user" : "model",
        parts: [{ text: msg.content }],
      };
    });

  // Using gemini-3-pro-preview for better coding capabilities
  const model = "gemini-3-pro-preview";

  const chat = ai.chats.create({
    model: model,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: toolsDef,
      temperature: 0.7,
      safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    },
    history: chatHistory,
  });

  let currentMessage = newMessage;
  
  // Agentic Loop
  while (true) {
    // Use 'any' to bypass strict type checks for this recursive tool loop pattern
    const result = await chat.sendMessageStream({ message: currentMessage as any });
    
    let textAccumulator = "";
    let toolCallAccumulator: any[] = [];

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        textAccumulator += text;
        yield { text };
      }
      
      const calls = chunk.functionCalls;
      if (calls && calls.length > 0) {
        toolCallAccumulator.push(...calls);
      }
    }

    if (toolCallAccumulator.length === 0) {
      break;
    }

    // Execute tools
    const toolResponses = [];
    for (const call of toolCallAccumulator) {
      // CRITICAL FIX: Generate ID once and reuse it for both call and result
      // This ensures the UI can match the start and end of the tool execution
      const stableCallId = call.id || Math.random().toString(36).substring(2, 10);
      
      // Yield the intention to call a tool
      yield { 
        toolCall: {
          toolCallId: stableCallId,
          toolName: call.name,
          args: call.args
        } 
      };
      
      try {
        console.log(`Executing tool: ${call.name}`, call.args);
        const functionResponse = await toolExecutor(call.name, call.args);
        
        // Yield the result using the SAME ID
        yield {
          toolResult: {
            toolCallId: stableCallId,
            result: functionResponse
          }
        };

        toolResponses.push({
          id: call.id || stableCallId, // Use provided ID or generated one if API didn't provide it
          name: call.name,
          response: { result: functionResponse }
        });
      } catch (err: any) {
        console.error(`Tool execution failed: ${err.message}`);
        toolResponses.push({
          id: call.id || stableCallId,
          name: call.name,
          response: { error: err.message }
        });
      }
    }

    // Prepare response for the next turn
    const responseParts = toolResponses.map(tr => ({
        functionResponse: {
            name: tr.name,
            response: tr.response,
            id: tr.id
        }
    }));
    
    currentMessage = responseParts as any; 
  }
}