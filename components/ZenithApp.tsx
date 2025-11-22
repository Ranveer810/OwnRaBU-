// FINAL ZENITHAPP UPDATE for SDK-native messages
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAgent } from '../hooks/use-agent';
import { useProject } from '../hooks/use-project';
import { ChatMessage } from './ChatMessage';
import { PreviewFrame } from './PreviewFrame';
import { CodeView } from './CodeView';
import { SettingsModal } from './SettingsModal';
import { Button } from './ui/Button';
import { Send, Code as CodeIcon, Eye, Sparkles, Settings as SettingsIcon, Download, Square } from 'lucide-react';
import { cn, downloadProjectAsZip } from '../lib/utils';
import { LLMSettings, DEFAULT_SETTINGS, ConsoleLog } from '../types';

const MAX_CONSOLE_LOGS = 1000;

export default function ZenithApp() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);

  const addLog = useCallback((log: ConsoleLog) => {
      setConsoleLogs(prev => {
        const newLogs = [...prev, log];
        if (newLogs.length > MAX_CONSOLE_LOGS) {
          return newLogs.slice(-MAX_CONSOLE_LOGS);
        }
        return newLogs;
      });
  }, []);

  useEffect(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('zenith_settings');
          if (saved) {
              try {
                  const parsed = JSON.parse(saved);
                  setSettings({
                      ...DEFAULT_SETTINGS,
                      ...parsed,
                      google: { ...DEFAULT_SETTINGS.google, ...(parsed.google || {}) },
                      groq: { ...DEFAULT_SETTINGS.groq, ...(parsed.groq || {}) },
                      openai: { ...DEFAULT_SETTINGS.openai, ...(parsed.openai || {}) },
                  });
              } catch (e) {
                  console.error("Failed to parse settings", e);
              }
          }
          setSettingsLoaded(true);
      }
  }, []);

  const handleSaveSettings = (newSettings: LLMSettings) => {
      setSettings(newSettings);
      if (typeof window !== 'undefined') {
          localStorage.setItem('zenith_settings', JSON.stringify(newSettings));
      }
  };

  const projectManager = useProject();
  const { project: latestProject } = projectManager;
  
  const { messages, input, handleInputChange, handleSubmit, stopGeneration, isLoading } = useAgent(projectManager, settings, consoleLogs);
  
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (latestProject) setActiveTab('preview');
  }, [latestProject]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  if (!settingsLoaded) return <div className="h-screen bg-zinc-950 text-white flex items-center justify-center">Loading...</div>;

  const isApiKeyMissing = !settings[settings.selectedProvider]?.apiKey;

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-50 font-sans overflow-hidden selection:bg-primary/20">
      
      <SettingsModal 
         isOpen={isSettingsOpen || isApiKeyMissing}
         onClose={() => setIsSettingsOpen(false)} 
         settings={settings}
         onSave={handleSaveSettings}
      />

      {isResizing && (
        <div className="fixed inset-0 z-[9999] bg-transparent cursor-col-resize" style={{ pointerEvents: 'all' }} />
      )}

      <div 
        style={{ width: sidebarWidth }}
        className="flex flex-col border-r border-border bg-zinc-950/50 backdrop-blur-xl z-10 shrink-0 relative"
      >
        <div className="h-14 shrink-0 border-b border-border flex items-center justify-between px-4 bg-zinc-950/80">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
               <Sparkles size={18} />
             </div>
             <span className="font-semibold tracking-tight text-sm truncate">Zenith AI Coder</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon size={16} className="text-zinc-400 hover:text-white transition-colors" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex w-full gap-3 p-4 animate-pulse">
               <div className="w-8 h-8 rounded-full bg-muted border border-border shrink-0"></div>
               <div className="flex flex-col gap-2 max-w-[85%] w-full">
                 <div className="h-4 w-24 bg-muted rounded"></div>
                 <div className="h-10 w-3/4 bg-muted rounded"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border bg-zinc-950 shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Describe a website..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-lg shadow-black/20"
              disabled={isLoading || isApiKeyMissing}
            />
            <div className="absolute right-1.5 top-1.5">
                {isLoading ? (
                    <Button
                        type="button"
                        size="icon"
                        onClick={stopGeneration}
                        className="h-8 w-8 rounded-lg bg-red-500 hover:bg-red-600 text-white animate-in fade-in zoom-in duration-200"
                        title="Stop Generation"
                    >
                        <Square size={12} fill="currentColor" />
                    </Button>
                ) : (
                    <Button 
                        type="submit" 
                        size="icon"
                        disabled={!input.trim() || isApiKeyMissing}
                        className={cn(
                            "h-8 w-8 rounded-lg transition-all",
                            input.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-zinc-800 text-zinc-600 hover:bg-zinc-700"
                        )}
                    >
                        <Send size={14} />
                    </Button>
                )}
            </div>
          </form>
        </div>
      </div>

      <div 
        className={cn(
            "w-1 hover:w-2 -ml-0.5 z-50 cursor-col-resize flex items-center justify-center transition-all bg-border hover:bg-primary",
            isResizing && "w-2 bg-primary"
        )}
        onMouseDown={startResizing}
      ></div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative overflow-hidden">
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />
         
         <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-zinc-950 z-10 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-border">
                <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        activeTab === 'preview' ? "bg-zinc-800 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-zinc-800/50"
                    )}
                >
                    <Eye size={14} /> Preview
                </button>
                <button
                    onClick={() => setActiveTab('code')}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        activeTab === 'code' ? "bg-zinc-800 text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-zinc-800/50"
                    )}
                >
                    <CodeIcon size={14} /> Code
                </button>
            </div>
            
            <div className="flex items-center gap-3">
                {latestProject && (
                    <>
                     <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs gap-2 bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                        onClick={() => downloadProjectAsZip(latestProject)}
                     >
                        <Download size={14} /> Export ZIP
                     </Button>
                     <div className="text-xs text-green-400 flex items-center gap-1.5 animate-in fade-in">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Generated
                    </div>
                    </>
                )}
            </div>
         </div>

         <div className="flex-1 p-4 overflow-hidden z-0">
            {activeTab === 'preview' ? (
                <PreviewFrame 
                    project={latestProject} 
                    isLoading={isLoading} 
                    logs={consoleLogs}
                    onLog={addLog}
                />
            ) : (
                <CodeView project={latestProject} />
            )}
         </div>
      </div>
    </div>
  );
}
