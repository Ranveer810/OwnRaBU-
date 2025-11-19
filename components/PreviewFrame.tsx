"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Smartphone, Tablet, Monitor, Terminal } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import { WebProject, ConsoleLog } from '../types';
import { X } from 'lucide-react';

interface PreviewFrameProps {
  project: WebProject | null;
  isLoading: boolean;
  onLog: (log: ConsoleLog) => void;
  logs: ConsoleLog[];
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({ project, isLoading, onLog, logs }) => {
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showConsole, setShowConsole] = useState(false);
  const [key, setKey] = useState(0);

  // Function to combine separate files into one HTML string for the iframe
  const generateSrcDoc = (proj: WebProject) => {
    const { html, css, javascript } = proj;
    
    // Script to intercept console logs and send them to parent
    const logInterceptor = `
      <script>
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          const originalInfo = console.info;

          function sendLog(type, args) {
            try {
              const message = args.map(arg => {
                if (typeof arg === 'object') return JSON.stringify(arg);
                return String(arg);
              }).join(' ');
              window.parent.postMessage({ type: 'CONSOLE_LOG', logType: type, message: message }, '*');
            } catch (e) {}
          }

          console.log = function(...args) { sendLog('log', args); originalLog.apply(console, args); };
          console.error = function(...args) { sendLog('error', args); originalError.apply(console, args); };
          console.warn = function(...args) { sendLog('warn', args); originalWarn.apply(console, args); };
          console.info = function(...args) { sendLog('info', args); originalInfo.apply(console, args); };
        })();
        
        window.onerror = function(msg, url, line, col, error) {
           window.parent.postMessage({ type: 'CONSOLE_LOG', logType: 'error', message: msg + ' (Line: ' + line + ')' }, '*');
        };
      </script>
    `;

    let finalHtml = html;

    // Inject CSS
    const styleTag = `<style>${css}</style>`;
    if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${logInterceptor}${styleTag}</head>`);
    } else {
        finalHtml = logInterceptor + styleTag + finalHtml;
    }

    // Inject JS
    finalHtml = finalHtml.replace(/<script src="script\.js".*?><\/script>/g, '');
    // Safe inject script escaping closing tags
    const safeJs = javascript.replace(/<\/script>/g, '<\\/script>');
    const scriptTag = `<script>${safeJs}</script>`;
    
    if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${scriptTag}</body>`);
    } else {
        finalHtml = finalHtml + scriptTag;
    }

    return finalHtml;
  };

  useEffect(() => {
      const handler = (event: MessageEvent) => {
          if (event.data && event.data.type === 'CONSOLE_LOG') {
              onLog({
                  type: event.data.logType,
                  message: event.data.message,
                  timestamp: Date.now()
              });
          }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
  }, [onLog]);

  const srcDoc = project ? generateSrcDoc(project) : '';

  const handleReload = () => {
    setKey(prev => prev + 1);
  };

  if (!project && !isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-zinc-900/50 rounded-lg border border-border border-dashed m-4">
        <Monitor className="w-12 h-12 mb-4 opacity-20" />
        <p>Ready to build. Ask Zenith to generate a website.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-zinc-900/50 shrink-0">
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <span className="text-xs text-muted-foreground ml-2 font-mono">preview.html</span>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8", viewMode === 'desktop' && "bg-accent text-white")}
                onClick={() => setViewMode('desktop')}
            >
                <Monitor size={14} />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8", viewMode === 'tablet' && "bg-accent text-white")}
                onClick={() => setViewMode('tablet')}
            >
                <Tablet size={14} />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8", viewMode === 'mobile' && "bg-accent text-white")}
                onClick={() => setViewMode('mobile')}
            >
                <Smartphone size={14} />
            </Button>
            <div className="w-px h-4 bg-border mx-1"></div>
            <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-8 px-2 text-xs gap-1.5", showConsole && "bg-accent text-white")}
                onClick={() => setShowConsole(!showConsole)}
            >
                <Terminal size={12} /> Console
                {logs.length > 0 && <span className="bg-red-500 text-white text-[9px] px-1 rounded-full">{logs.length}</span>}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReload}>
                <RefreshCw size={14} />
            </Button>
        </div>
      </div>

      <div className="flex-1 relative w-full flex flex-col bg-zinc-900/20 backdrop-blur-sm overflow-hidden">
         <div className="flex-1 overflow-auto p-4 flex justify-center custom-scrollbar relative">
            {isLoading && !project && (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-zinc-950/80">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground animate-pulse">Generating files...</span>
                    </div>
                </div>
            )}
            
            <div className={cn(
                "transition-all duration-500 ease-in-out bg-white shadow-2xl overflow-hidden shrink-0 origin-top",
                viewMode === 'desktop' ? "w-full h-full rounded-sm" : 
                viewMode === 'tablet' ? "w-[768px] h-[1024px] rounded-md border-8 border-zinc-800 my-auto" : 
                "w-[375px] h-[812px] rounded-[2rem] border-8 border-zinc-800 my-auto"
            )}>
                {project && (
                    <iframe
                        key={key}
                        srcDoc={srcDoc}
                        title="Preview"
                        className="w-full h-full bg-white"
                        sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                    />
                )}
            </div>
         </div>

         {/* Console Panel */}
         {showConsole && (
             <div className="h-48 border-t border-border bg-[#0d0d0d] flex flex-col shrink-0 animate-in slide-in-from-bottom-20">
                 <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-border">
                     <span className="text-xs font-medium text-zinc-400">Console Output</span>
                     <button onClick={() => setShowConsole(false)} className="text-zinc-500 hover:text-white"><X size={12}/></button>
                 </div>
                 <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1">
                     {logs.length === 0 ? (
                         <div className="text-zinc-600 italic px-2">No logs yet...</div>
                     ) : (
                         logs.map((log, i) => (
                             <div key={i} className={cn(
                                 "border-b border-white/5 pb-1 last:border-0 break-all",
                                 log.type === 'error' ? "text-red-400 bg-red-900/10 px-1" : 
                                 log.type === 'warn' ? "text-yellow-400" : "text-zinc-300"
                             )}>
                                 <span className="opacity-50 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                 {log.message}
                             </div>
                         ))
                     )}
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};