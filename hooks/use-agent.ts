import React, { useState, useCallback, useRef } from 'react';
import { Message, Sender, MessagePart, LLMSettings, ConsoleLog } from '../types';
import { streamChat } from '../lib/llm-service';
import { generateId } from '../lib/utils';
import { useProject } from './use-project';
import * as runtime from '../lib/runtime-tools';

export function useAgent(
  projectManager: ReturnType<typeof useProject>, 
  settings: LLMSettings,
  consoleLogs: ConsoleLog[]
) {
  const { projectRef, updateFile, patchFile, DEFAULT_PROJECT } = projectManager;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: Sender.ASSISTANT,
      content: "Hello! I'm Zenith. I can build modern websites for you. I can now read your code, make updates, test functionality, and even look at the design with screenshots!",
      parts: [{ type: 'text', text: "Hello! I'm Zenith. I can build modern websites for you. I can now read your code, make updates, test functionality, and even look at the design with screenshots!" }],
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
    }
  }, []);

  const executeTool = useCallback(async (name: string, args: any) => {
    const currentProj = projectRef.current || DEFAULT_PROJECT;
    
    switch (name) {
        case 'read_files':
            console.log("Reading project files...");
            return {
                status: "success",
                summary: "Read 3 files",
                files: currentProj
            };

        case 'update_file':
            const updateResult = updateFile(args.target, args.content);
            if (updateResult.success) {
                return { status: "success", message: `Updated ${args.target}` };
            }
            return { status: "error", message: updateResult.message };

        case 'patch_file':
            const patchResult = patchFile(args.target, args.search_string, args.replacement_string);
            if (patchResult.success) {
                return { status: "success", message: patchResult.message || `Patched ${args.target}` };
            }
            return { status: "error", message: patchResult.message };

        case 'screenshot_website':
            return runtime.takeScreenshot(currentProj);

        case 'validate_functionality':
            return runtime.runProjectTest(currentProj, args.test_script);

        case 'read_console_logs':
            return {
                status: "success",
                logs: consoleLogs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n') || "No console logs found."
            };

        default:
            return { status: "error", message: "Unknown tool" };
    }
  }, [projectRef, updateFile, patchFile, DEFAULT_PROJECT, consoleLogs]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    // Abort previous request if active
    if (isLoading && abortControllerRef.current) {
        abortControllerRef.current.abort();
    }

    const userMessage: Message = {
      id: generateId(),
      role: Sender.USER,
      content: input,
      parts: [{ type: 'text', text: input }],
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMsgId = generateId();
    setMessages((prev) => [...prev, {
        id: assistantMsgId,
        role: Sender.ASSISTANT,
        content: '',
        parts: [],
        timestamp: Date.now()
    }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const stream = streamChat(messages, input, settings, executeTool, abortController.signal);
      
      for await (const chunk of stream) {
        
        // 1. Handle Text Chunks
        if (chunk.text) {
            setMessages((prev) => prev.map(msg => {
                if (msg.id !== assistantMsgId) return msg;

                const currentParts = msg.parts || [];
                const lastPart = currentParts[currentParts.length - 1];

                let newParts: MessagePart[];

                if (lastPart && lastPart.type === 'text') {
                    const updatedLastPart = { ...lastPart, text: lastPart.text + chunk.text };
                    newParts = [...currentParts.slice(0, -1), updatedLastPart];
                } else {
                    newParts = [...currentParts, { type: 'text', text: chunk.text! }];
                }

                return {
                    ...msg,
                    content: msg.content + chunk.text,
                    parts: newParts
                };
            }));
        }
        
        // 2. Handle Tool Call
        if (chunk.toolCall) {
            setMessages((prev) => prev.map(msg => {
                if (msg.id !== assistantMsgId) return msg;

                const newPart: MessagePart = {
                    type: 'tool-invocation',
                    toolInvocation: chunk.toolCall!
                };

                return {
                    ...msg,
                    parts: [...(msg.parts || []), newPart]
                };
            }));
        }

        // 3. Handle Tool Result
        if (chunk.toolResult) {
            setMessages((prev) => prev.map(msg => {
                if (msg.id !== assistantMsgId) return msg;

                const updatedParts = (msg.parts || []).map(part => {
                    if (part.type === 'tool-invocation' && part.toolInvocation.toolCallId === chunk.toolResult!.toolCallId) {
                        return {
                            ...part,
                            toolInvocation: {
                                ...part.toolInvocation,
                                result: chunk.toolResult!.result
                            }
                        };
                    }
                    return part;
                });

                return { ...msg, parts: updatedParts };
            }));
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
          console.log("Generation stopped by user");
      } else {
          console.error("Agent Error:", error);
          setMessages((prev) => prev.map(msg => 
            msg.id === assistantMsgId 
            ? { 
                ...msg, 
                content: msg.content + `\n\n[Error: ${error.message || 'Connection failed'}]`,
                parts: [...(msg.parts || []), { type: 'text', text: `\n\n[Error: ${error.message || 'Connection failed'}]` }]
              }
            : msg
          ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, messages, executeTool, settings, isLoading]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    stopGeneration,
    isLoading
  };
}