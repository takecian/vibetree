import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TerminalViewProps {
    taskId: string;
}

export function TerminalView({ taskId }: TerminalViewProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);

    const [connected, setConnected] = useState<boolean>(false);

    useEffect(() => {
        // Initialize Socket
        const socket: Socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('terminal:create', { cols: 80, rows: 24, taskId });
        });

        socket.on(`terminal:data:${taskId || 'default'}`, (data: string) => {
            xtermRef.current?.write(data);
        });

        socket.on('terminal:error', (message: string) => {
            console.error('Terminal error from server:', message);
            xtermRef.current?.write(`\r\nError: ${message}\r\n`);
        });

        // Initialize xterm
        const term: Terminal = new Terminal({
            cursorBlink: true,
            theme: { background: '#0f172a', foreground: '#f8fafc', cursor: '#3b82f6' },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14
        });

        const fitAddon: FitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Handle input
        term.onData((data: string) => {
            if (socketRef.current?.connected) {
                socketRef.current.emit(`terminal:input:${taskId || 'default'}`, data);
            }
        });

        const openTerminal = () => {
            if (terminalRef.current) {
                term.open(terminalRef.current);
                xtermRef.current = term;
                fitAddonRef.current = fitAddon;
                setTimeout(() => {
                    try {
                        fitAddon.fit();
                        const { cols, rows } = term;
                        socketRef.current?.emit(`terminal:resize:${taskId || 'default'}`, { cols, rows });
                    } catch (e) {
                        console.error("Fit error ignored:", e);
                    }
                }, 0);
            }
        };

        let resizeObserver: ResizeObserver | undefined;

        if (terminalRef.current) {
            // Initial check if dimensions are already available
            if (terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
                openTerminal();
            }

            resizeObserver = new ResizeObserver(() => {
                if (!terminalRef.current) return;

                // Lazy open if not yet opened
                if (!xtermRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
                    openTerminal();
                }

                // Resize if already opened
                if (xtermRef.current && terminalRef.current.clientWidth > 0 && terminalRef.current.clientHeight > 0) {
                    try {
                        fitAddon.fit();
                        const { cols, rows } = term;
                        if (cols > 0 && rows > 0) {
                            socketRef.current?.emit(`terminal:resize:${taskId || 'default'}`, { cols, rows });
                        }
                    } catch (e) {
                        console.error("Fit error ignored:", e);
                    }
                }
            });
            resizeObserver.observe(terminalRef.current);
        }

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            socket.disconnect();
            term.dispose();
            xtermRef.current = null;
        };
    }, [taskId]);

    return (
        <div className="w-full h-full bg-slate-900 p-2 overflow-hidden rounded-lg border border-slate-600 min-w-[100px] min-h-[100px]">
            <div ref={terminalRef} className="w-full h-full" />
        </div>
    );
}
