import { WebProject } from '../types';

/**
 * Captures a screenshot of the current project state by rendering it into a hidden container.
 */
export const takeScreenshot = async (project: WebProject): Promise<{ status: string, message: string, image?: string }> => {
    if (typeof window === 'undefined') return { status: 'error', message: 'Cannot screenshot on server' };
    
    try {
        // Create a temporary container to render the project for screenshotting
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '1280px'; // Desktop width
        container.style.height = '800px';
        container.style.zIndex = '-1000'; // Hide behind everything
        container.style.overflow = 'hidden';
        container.style.background = '#fff';
        document.body.appendChild(container);

        // Combine HTML/CSS for render
        let content = project.html;
        const styleTag = `<style>${project.css}</style>`;
        if (content.includes('</head>')) {
            content = content.replace('</head>', `${styleTag}</head>`);
        } else {
            content = styleTag + content;
        }
        
        container.innerHTML = content;

        // Small delay to let styles apply and fonts load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capture
        const html2canvas = (window as any).html2canvas;
        if (!html2canvas) throw new Error("html2canvas library not loaded");

        const canvas = await html2canvas(container, {
            useCORS: true,
            logging: false,
            width: 1280,
            height: 800,
            scale: 1 // Standard scale to keep base64 size reasonable
        });

        const base64Image = canvas.toDataURL('image/png');
        
        // Cleanup
        document.body.removeChild(container);

        return { 
            status: "success", 
            message: "Screenshot captured successfully", 
            image: base64Image // Pass the image back so the UI can render it
        };

    } catch (e: any) {
        console.error("Screenshot failed", e);
        return { status: "error", message: `Screenshot failed: ${e.message}` };
    }
};

/**
 * Runs a sandboxed test script against the project.
 */
export const runProjectTest = async (project: WebProject, test_script: string): Promise<{ status: string, message: string }> => {
    if (typeof window === 'undefined') return { status: 'error', message: 'Cannot test on server' };

    try {
        return await new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            // Timeout safety
            const timeout = setTimeout(() => {
                document.body.removeChild(iframe);
                resolve({ status: "error", message: "Test timed out after 5s" });
            }, 5000);

            // Listen for message from the iframe
            const handler = (event: MessageEvent) => {
                if (event.data.type === 'TEST_RESULT') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    try {
                         document.body.removeChild(iframe);
                    } catch(e) {}
                    
                    if (event.data.status === 'success') {
                        resolve({ status: "success", message: "Test Passed Successfully" });
                    } else {
                        resolve({ status: "error", message: `Test Failed: ${event.data.message}` });
                    }
                }
            };
            window.addEventListener('message', handler);

            // Prepare Content with error trapping and test injection
            const content = `
                ${project.html}
                <style>${project.css}</style>
                <script>
                    // Error trapping
                    window.onerror = (msg) => window.parent.postMessage({ type: 'TEST_RESULT', status: 'error', message: msg }, '*');
                    console.log = () => {}; // Silence logs
                </script>
                <script>${project.javascript}</script>
                <script>
                    setTimeout(() => {
                        try {
                            (function() {
                                ${test_script}
                            })();
                            window.parent.postMessage({ type: 'TEST_RESULT', status: 'success' }, '*');
                        } catch(e) {
                            window.parent.postMessage({ type: 'TEST_RESULT', status: 'error', message: e.message }, '*');
                        }
                    }, 500); // Wait for main script
                </script>
            `;
            
            iframe.srcdoc = content;
        });

    } catch (e: any) {
        return { status: "error", message: `Test runner error: ${e.message}` };
    }
};