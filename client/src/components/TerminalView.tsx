import { useEffect, useRef } from 'react';
import { useTerminals } from '../context/TerminalContext';
import '@xterm/xterm/css/xterm.css';

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
                while (terminalRef.current.firstChild) {
                    terminalRef.current.removeChild(terminalRef.current.firstChild);
                }

                if (terminal.element) {
                    terminalRef.current.appendChild(terminal.element);
                } else {
                    terminal.open(terminalRef.current);
                }

                terminal.focus();

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
                    }, 100);
                });
            }
        };

        let resizeObserver: ResizeObserver | undefined;

        if (terminalRef.current) {
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
