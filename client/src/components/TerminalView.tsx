import { useEffect, useRef } from 'react';
import { useTerminals } from '../context/TerminalContext';
import 'xterm/css/xterm.css';

interface TerminalViewProps {
    taskId: string;
    repoPath: string;
}

export function TerminalView({ taskId, repoPath }: TerminalViewProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const { getTerminalSession } = useTerminals();
    const sessionRef = useRef<any>(null);

    useEffect(() => {
        const session = getTerminalSession(taskId, repoPath);
        sessionRef.current = session;
        const { terminal, fitAddon, socket } = session;

        const openTerminal = () => {
            if (terminalRef.current) {
                // Clear existing content to prevent layering
                while (terminalRef.current.firstChild) {
                    terminalRef.current.removeChild(terminalRef.current.firstChild);
                }

                terminal.open(terminalRef.current);
                terminal.focus();

                // Use a slightly longer delay or requestAnimationFrame to ensure DOM is ready
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        try {
                            fitAddon.fit();
                            const { cols, rows } = terminal;
                            if (cols > 0 && rows > 0) {
                                socket.emit(`terminal:resize:${taskId || 'default'}`, { cols, rows });
                            }
                        } catch (e) {
                            console.error("Fit error ignored:", e);
                        }
                    }, 50);
                });
            }
        };

        let resizeObserver: ResizeObserver | undefined;

        if (terminalRef.current) {
            // Initial mount
            openTerminal();

            resizeObserver = new ResizeObserver(() => {
                if (!terminalRef.current) return;
                try {
                    fitAddon.fit();
                    const { cols, rows } = terminal;
                    if (cols > 0 && rows > 0) {
                        socket.emit(`terminal:resize:${taskId || 'default'}`, { cols, rows });
                    }
                } catch (e) {
                    console.error("Fit error ignored:", e);
                }
            });
            resizeObserver.observe(terminalRef.current);
        }

        return () => {
            if (resizeObserver) resizeObserver.disconnect();

            // Detach terminal element from DOM to prevent it from sticking around
            // when switching tasks or Tabs, which might cause layout issues.
            // Note: We don't dispose() the terminal as it is managed by TerminalContext
            const element = terminal.element;
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        };
    }, [taskId, getTerminalSession]);

    return (
        <div className="w-full h-full bg-[#0f172a] relative overflow-hidden">
            <div ref={terminalRef} className="absolute inset-0" />
        </div>
    );
}
