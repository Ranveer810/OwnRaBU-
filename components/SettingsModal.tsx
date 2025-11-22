"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RefreshCw, Settings as SettingsIcon, Key, Cpu, Globe } from 'lucide-react';
import { Button } from './ui/Button';
import { LLMSettings, LLMModel, ProviderConfig } from '../types';
import { getAvailableModels } from '../lib/llm-service';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LLMSettings;
  onSave: (settings: LLMSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings: initialSettings, onSave }) => {
  const [settings, setSettings] = useState<LLMSettings>(initialSettings);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for provider/apiKey/model (to check for changes)
  const prevProvider = useRef(settings.selectedProvider);
  const prevApiKey = useRef(settings[settings.selectedProvider].apiKey);

  // On apiKey or provider change, fetch models
  useEffect(() => {
    let ignore = false;
    async function reloadModels() {
      setIsLoadingModels(true);
      const fetched = await getAvailableModels(settings);
      if (!ignore) setModels(fetched);
      setIsLoadingModels(false);
    }
    reloadModels(); // on mount
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    // auto-fetch models if provider or apiKey changes
    if (
      prevProvider.current !== settings.selectedProvider ||
      prevApiKey.current !== settings[settings.selectedProvider].apiKey
    ) {
      setIsLoadingModels(true);
      getAvailableModels(settings).then(setModels).finally(() => setIsLoadingModels(false));
      prevProvider.current = settings.selectedProvider;
      prevApiKey.current = settings[settings.selectedProvider].apiKey;
    }
  }, [settings.selectedProvider, settings[settings.selectedProvider].apiKey]);

  // Always reset local state + fetch models if modal opens
  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
    }
  }, [isOpen, initialSettings]);

  const handleSave = () => {
    setIsSaving(true);
    onSave(settings);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  const updateProviderConfig = (key: keyof ProviderConfig, value: string) => {
    setSettings(prev => ({
      ...prev,
      [prev.selectedProvider]: {
        ...prev[prev.selectedProvider],
        [key]: value
      }
    }));
  };

  const activeConfig = settings[settings.selectedProvider];
  const preventClose = !activeConfig.apiKey || !activeConfig.model;

  if (!isOpen) return null;

  // Prevent closing on backdrop/X/cancel if credentials incomplete
  const safeOnClose = () => { if (!preventClose) onClose(); };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" tabIndex={-1} {
      ...((preventClose ? {onKeyDown: (e:any) => {e.stopPropagation(); if(e.key==="Escape"){e.preventDefault();}}} : {}) )
    }>
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-100">
            <SettingsIcon size={18} />
            <h2 className="font-semibold">Settings</h2>
          </div>
          <button onClick={safeOnClose} disabled={preventClose} className={cn("text-zinc-500 hover:text-zinc-100 transition-colors", preventClose && "opacity-60 pointer-events-none")}> <X size={18} /></button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Provider Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe size={12} /> Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
                {(['google', 'groq', 'openai'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => {
                            const newSettings = { ...settings, selectedProvider: p };
                            setSettings(newSettings);
                        }}
                        className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                            settings.selectedProvider === p 
                            ? "bg-primary/20 border-primary text-primary" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                        )}
                    >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                ))}
            </div>
          </div>
          {/* API Key */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key size={12} /> {settings.selectedProvider.charAt(0).toUpperCase() + settings.selectedProvider.slice(1)} API Key
            </label>
            <input
                type="password"
                value={activeConfig.apiKey}
                onChange={(e) => updateProviderConfig('apiKey', e.target.value)}
                placeholder={`Enter your ${settings.selectedProvider} API Key`}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-zinc-600">Your key is stored locally in your browser.</p>
          </div>
          {/* Base URL (Only for OpenAI) */}
          {settings.selectedProvider === 'openai' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Base URL (Optional)</label>
                <input
                    type="text"
                    value={activeConfig.baseUrl || ''}
                    onChange={(e) => updateProviderConfig('baseUrl', e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
          )}
          {/* Model Selection (Bound to activeConfig) */}
          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={12} /> Model
                </label>
                <button 
                    onClick={() => getAvailableModels(settings).then(setModels)} 
                    disabled={isLoadingModels || !activeConfig.apiKey}
                    className="text-[10px] flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                >
                    <RefreshCw size={10} className={cn(isLoadingModels && "animate-spin")} /> Refresh
                </button>
             </div>
             <select
                value={activeConfig.model}
                onChange={(e) => updateProviderConfig('model', e.target.value)}
                disabled={!activeConfig.apiKey}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
             >
                <option value="" disabled>Select a model...</option>
                {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
             </select>
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
            <Button variant="ghost" onClick={safeOnClose} disabled={preventClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !activeConfig.apiKey || !activeConfig.model}>
                {isSaving ? (
                    <>
                        <RefreshCw size={14} className="mr-2 animate-spin" /> Saving...
                    </>
                ) : (
                    <>
                        <Save size={14} className="mr-2" /> Save Settings
                    </>
                )}
            </Button>
        </div>
      </div>
    </div>
  );
};
