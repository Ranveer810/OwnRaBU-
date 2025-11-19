import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function extractCodeBlock(content: string): string | null {
  const regex = /```(?:tsx|jsx|html|javascript|typescript)?\n([\s\S]*?)```/;
  const match = content.match(regex);
  return match ? match[1] : null;
}

export async function downloadProjectAsZip(project: any) {
  const JSZip = (window as any).JSZip;
  if (!JSZip) { 
    console.error("JSZip not loaded"); 
    alert("Download library not ready yet. Please try again in a moment.");
    return; 
  }
  
  try {
    const zip = new JSZip();
    zip.file("index.html", project.html);
    zip.file("styles.css", project.css);
    zip.file("script.js", project.javascript);
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "zenith-project.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error("Failed to zip project", e);
    alert("Failed to generate zip file.");
  }
}