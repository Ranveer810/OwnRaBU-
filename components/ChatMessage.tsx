// --- UPDATED ChatMessage.tsx for Vercel AI SDK native message compatibility ---
"use client";

import React from 'react';
import { cn } from '../lib/utils';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
    Tool, 
    ToolHeader, 
    ToolContent, 
    ToolInput, 
    ToolOutput, 
    ToolState 
} from './ui/ToolUI';

// Accept any message structure compatible with AI SDK
interface ChatMessageProps {
  message: any;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  // SDK's role is just a string
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  const getToolState = (tool: any): ToolState => {
      if (tool.result) {
          if (tool.result.status === 'error') {
              return 'output-error';
          }
          return 'output-available'; // Completed successfully
      }
      return 'input-available'; // Still running/executing
  };

  // Helper to render a text bubble
  const renderTextBubble = (content: string, index: number) => {
      if (!content || !content.trim()) return null;
      
      return (
        <div key={`text-${index}`} className={cn(
            "rounded-lg px-4 py-3 text-sm shadow-sm overflow-hidden w-fit max-w-full animate-in fade-in slide-in-from-bottom-1",
            isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-card border border-border text-card-foreground"
        )}>
            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10 break-words">
                <ReactMarkdown 
                    components={{
                        code({node, inline, className, children, ...props}: any) {
                            return !inline ? (
                                <code className="block bg-black/30 p-2 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto" {...props}>
                                    {children}
                                </code>
                            ) : (
                                <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono break-all" {...props}>
                                    {children}
                                </code>
                            )
                        },
                        p({ children }) {
                            return <p className="mb-2 last:mb-0 break-words">{children}</p>
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
      );
  };

  // Helper to render tool or attachments
  const renderToolCard = (tool: any, index: number) => {
      const state = getToolState(tool);
      // Keep collapsed by default
      const defaultOpen = false; 

      return (
        <div key={`tool-${tool.toolCallId || index}-${index}`} className="w-full max-w-[500px] animate-in zoom-in-95 duration-300">
            <Tool defaultOpen={defaultOpen}>
                <ToolHeader 
                    toolName={tool.toolName || tool.type} 
                    state={state} 
                />
                <ToolContent>
                    <ToolInput input={tool.args} />
                    <ToolOutput 
                        output={tool.result} 
                        errorText={tool.result?.status === 'error' ? tool.result.message : undefined} 
                    />
                </ToolContent>
            </Tool>
        </div>
      );
  };

  // Main Render Logic: Iterate AI SDK parts robustly
  const renderParts = () => {
      if (!message.parts || !Array.isArray(message.parts)) {
          return renderTextBubble(message.content, 0);
      }

      return message.parts.map((part: any, index: number) => {
          if (part.type === 'text' && part.text) {
              return renderTextBubble(part.text, index);
          } else if (part.type === 'tool-invocation' && part.toolInvocation) {
              return renderToolCard(part.toolInvocation, index);
          }
          // Ignore unknown part types, handle others gracefully
          return null;
      });
  };

  return (
    <div className={cn(
      "flex w-full gap-3 p-4 transition-all",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm mt-1",
        isUser ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-foreground"
      )}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={cn(
        "flex max-w-[85%] flex-col gap-2",
        isUser ? "items-end" : "items-start"
      )}>
         {renderParts()}
      </div>
    </div>
  );
};
