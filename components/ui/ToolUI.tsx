"use client";

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { 
    Loader2, Check, X, ChevronRight, 
    FileSearch, FilePenLine, GitMerge, Terminal, 
    AlertCircle, Database, Globe, Camera, FlaskConical
} from 'lucide-react';

// Types corresponding to Vercel AI SDK Tool states
export type ToolState = 
    | 'input-streaming' 
    | 'input-available' 
    | 'output-available' 
    | 'output-error' 
    | 'output-denied'
    | 'approval-requested' 
    | 'approval-responded';

interface ToolProps {
    children: React.ReactNode;
    className?: string;
    defaultOpen?: boolean;
}

export const Tool: React.FC<ToolProps> = ({ children, className, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className={cn("group flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-all my-2", className)}>
             {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    // Pass isOpen state to Header and Content
                    return React.cloneElement(child as any, { isOpen, setIsOpen });
                }
                return child;
             })}
        </div>
    );
};

interface ToolHeaderProps {
    toolName: string;
    state: ToolState;
    isOpen?: boolean;
    setIsOpen?: (v: boolean) => void;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({ toolName, state, isOpen, setIsOpen }) => {
    // Derive visual state
    const isRunning = state === 'input-streaming' || state === 'input-available';
    const isError = state === 'output-error' || state === 'output-denied';
    const isSuccess = state === 'output-available' || state === 'approval-responded';
    const isWaiting = state === 'approval-requested';

    // Icon Selection based on tool name
    const getIcon = (name: string) => {
        if (name.includes('read')) return FileSearch;
        if (name.includes('update')) return FilePenLine;
        if (name.includes('patch')) return GitMerge;
        if (name.includes('search')) return Globe;
        if (name.includes('database')) return Database;
        if (name.includes('screenshot')) return Camera;
        if (name.includes('validate') || name.includes('test')) return FlaskConical;
        return Terminal;
    };

    const Icon = getIcon(toolName);
                 
    return (
        <div 
            className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-800/50 transition-colors select-none"
            onClick={() => setIsOpen && setIsOpen(!isOpen)}
        >
            <div className="flex items-center gap-3">
                 <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-md border shadow-sm transition-colors",
                    isSuccess ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                    isError ? "bg-red-500/10 border-red-500/20 text-red-400" :
                    isWaiting ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
                    "bg-zinc-800 border-zinc-700 text-zinc-400"
                 )}>
                    <Icon size={12} />
                 </div>
                 <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-zinc-200 font-mono tracking-tight">{toolName}</span>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                        {state.replace('-', ' ')}
                    </span>
                 </div>
            </div>
            
            <div className="flex items-center gap-2">
                {isRunning && <Loader2 size={14} className="animate-spin text-zinc-500" />}
                {isSuccess && <Check size={14} className="text-green-500 scale-in-50 animate-in duration-200" />}
                {isError && <X size={14} className="text-red-500" />}
                {isWaiting && <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />}
                
                <div className={cn("transition-transform duration-200 text-zinc-500", isOpen ? "rotate-90" : "")}>
                    <ChevronRight size={14} />
                </div>
            </div>
        </div>
    );
}

interface ToolContentProps {
    children: React.ReactNode;
    isOpen?: boolean;
}

export const ToolContent: React.FC<ToolContentProps> = ({ children, isOpen }) => {
    if (!isOpen) return null;
    return (
        <div className="border-t border-zinc-800/50 bg-zinc-950/30 animate-in slide-in-from-top-1 duration-200">
            {children}
        </div>
    );
};

interface ToolInputProps {
    input: any;
}

export const ToolInput: React.FC<ToolInputProps> = ({ input }) => {
    const isEmpty = !input || Object.keys(input).length === 0;
    if (isEmpty) return null;
    
    return (
        <div className="px-4 py-3 border-b border-zinc-800/50 last:border-0 group/input">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                Input
            </div>
            <div className="font-mono text-xs text-zinc-300 whitespace-pre-wrap break-all bg-zinc-900/50 rounded-md p-2 border border-zinc-800/50 group-hover/input:border-zinc-700 transition-colors">
                {JSON.stringify(input, null, 2)}
            </div>
        </div>
    );
};

interface ToolOutputProps {
    output?: any;
    errorText?: string;
}

export const ToolOutput: React.FC<ToolOutputProps> = ({ output, errorText }) => {
    if (!output && !errorText) return null;
    
    const hasImage = output && output.image && typeof output.image === 'string';

    return (
        <div className="px-4 py-3 bg-zinc-900/20">
             <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                {errorText ? (
                    <span className="text-red-400 flex items-center gap-1"><AlertCircle size={10} /> Error</span>
                ) : (
                    <span className="text-green-400 flex items-center gap-1"><Check size={10} /> Result</span>
                )}
             </div>
             
             {/* Image Display if present */}
             {hasImage && (
                 <div className="mb-2 rounded-md overflow-hidden border border-zinc-800/50">
                     <img src={output.image} alt="Screenshot" className="w-full h-auto object-contain max-h-[200px]" />
                 </div>
             )}

             <div className={cn(
                "font-mono text-xs whitespace-pre-wrap break-all rounded-md p-2 border overflow-x-auto custom-scrollbar max-h-64",
                errorText 
                    ? "text-red-300 bg-red-950/10 border-red-900/20" 
                    : "text-zinc-300 bg-green-950/5 border-green-900/10"
             )}>
                 {/* Don't show giant base64 string in text output */}
                {errorText || (hasImage ? JSON.stringify({...output, image: '[Base64 Image Truncated]'}, null, 2) : (typeof output === 'string' ? output : JSON.stringify(output, null, 2)))}
             </div>
        </div>
    );
};

// --- Confirmation Components (Skeleton Impl) ---

export const Confirmation = ({ children, state, approval }: any) => (
    <div className={cn(
        "px-4 py-3 border-t border-zinc-800/50", 
        state === 'approval-requested' ? "bg-yellow-950/10" : ""
    )}>
        {children}
    </div>
);

export const ConfirmationTitle = ({ children }: any) => (
    <div className="flex items-center gap-3 text-xs mb-2">{children}</div>
);

export const ConfirmationRequest = ({ children }: any) => (
    <span className="text-zinc-300 font-medium flex-1 leading-relaxed">{children}</span>
);

export const ConfirmationAccepted = ({ children }: any) => (
    <span className="text-green-400 flex items-center gap-1.5 font-medium bg-green-950/30 px-2 py-0.5 rounded border border-green-900/30">
        {children}
    </span>
);

export const ConfirmationRejected = ({ children }: any) => (
    <span className="text-red-400 flex items-center gap-1.5 font-medium bg-red-950/30 px-2 py-0.5 rounded border border-red-900/30">
        {children}
    </span>
);

export const ConfirmationActions = ({ children }: any) => (
    <div className="flex gap-2 mt-3 justify-end border-t border-dashed border-zinc-800 pt-2">{children}</div>
);

export const ConfirmationAction = ({ children, variant, onClick }: any) => (
    <button 
        onClick={onClick} 
        className={cn(
            "text-xs px-3 py-1.5 rounded-md font-medium transition-colors", 
            variant === 'default' 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                : "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800"
        )}
    >
        {children}
    </button>
);