import { useState, useRef, useCallback } from 'react';
import { WebProject } from '../types';

const DEFAULT_PROJECT: WebProject = {
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>New Page</title>\n</head>\n<body>\n<div class="min-h-screen flex items-center justify-center bg-gray-100">\n  <h1 class="text-4xl font-bold text-gray-900">Hello World</h1>\n</div>\n</body>\n</html>',
  css: '/* Styles */',
  javascript: '// Scripts'
};

export function useProject() {
  const [project, setProjectState] = useState<WebProject | null>(null);
  
  // We use a Ref to keep track of the project state synchronously.
  // This is crucial because the AI might perform multiple operations (Update -> Read)
  // in a single conversational turn, and we can't wait for React state updates.
  const projectRef = useRef<WebProject | null>(null);

  const setProject = useCallback((p: WebProject | null) => {
    projectRef.current = p;
    setProjectState(p);
  }, []);

  const updateFile = useCallback((target: string, content: string) => {
    const current = projectRef.current || DEFAULT_PROJECT;
    if (['html', 'css', 'javascript'].includes(target)) {
        const next = { ...current, [target]: content };
        setProject(next);
        return { success: true, project: next };
    }
    return { success: false, message: "Invalid target" };
  }, [setProject]);

  const patchFile = useCallback((target: string, search: string, replace: string) => {
    const current = projectRef.current || DEFAULT_PROJECT;
    if (['html', 'css', 'javascript'].includes(target)) {
        const fileContent = current[target as keyof WebProject];
        
        // Exact match
        if (fileContent.includes(search)) {
             const newContent = fileContent.replace(search, replace);
             const next = { ...current, [target]: newContent };
             setProject(next);
             return { success: true, project: next };
        }
        
        // Lenient match (trimmed)
        const trimmedSearch = search.trim();
        if (fileContent.includes(trimmedSearch)) {
             const newContent = fileContent.replace(trimmedSearch, replace);
             const next = { ...current, [target]: newContent };
             setProject(next);
             return { success: true, project: next, message: "Patched with lenient match" };
        }

        return { success: false, message: `Could not find search string in ${target}` };
    }
    return { success: false, message: "Invalid target" };
  }, [setProject]);

  return {
    project,
    projectRef, // Expose ref for immediate access by agent
    setProject,
    updateFile,
    patchFile,
    DEFAULT_PROJECT
  };
}