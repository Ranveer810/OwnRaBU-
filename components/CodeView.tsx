"use client";

import React, { useState } from 'react';
import { Copy, Check, FileCode, FileJson, FileType } from 'lucide-react';
import { Button } from './ui/Button';
import { WebProject } from '../types';
import { cn } from '../lib/utils';

interface CodeViewProps {
  project: WebProject | null;
}

export const CodeView: React.FC<CodeViewProps> = ({ project }) => {
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState<'html' | 'css' | 'javascript'>('html');

  const handleCopy = () => {
    if (project) {
      navigator.clipboard.writeText(project[activeFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No project generated yet.
      </div>
    );
  }

  const getFileIcon = (type: string) => {
    switch(type) {
        case 'html': return <FileCode size={14} className="text-orange-500" />;
        case 'css': return <FileType size={14} className="text-blue-400" />;
        case 'javascript': return <FileJson size={14} className="text-yellow-400" />;
        default: return <FileCode size={14} />;
    }
  }

  return (
    <div className="relative h-full flex flex-col bg-[#0d0d0d] text-gray-300 font-mono text-sm border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-2 py-2 bg-zinc-900 border-b border-border">
        
        {/* File Tabs */}
        <div className="flex items-center gap-1">
            {(['html', 'css', 'javascript'] as const).map((type) => (
                <button
                    key={type}
                    onClick={() => setActiveFile(type)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-all border border-transparent",
                        activeFile === type 
                            ? "bg-zinc-800 text-white border-zinc-700 shadow-sm" 
                            : "text-muted-foreground hover:text-white hover:bg-zinc-800/50"
                    )}
                >
                    {getFileIcon(type)}
                    {type === 'html' ? 'index.html' : type === 'css' ? 'styles.css' : 'script.js'}
                </button>
            ))}
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCopy}
          className="h-7 text-xs gap-1.5 hover:bg-zinc-800"
        >
          {copied ? <Check size={12} className="text-green-500"/> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs leading-relaxed">
          <code>{project[activeFile]}</code>
        </pre>
      </div>
    </div>
  );
};