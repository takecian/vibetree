import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import styles from './TerminalView.module.css';

const SOCKET_URL = 'http://localhost:3000';

export function TerminalView({ taskId }) {
    const terminalRef = useRef(null);
    const socketRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);

    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Initialize Socket
        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('terminal:create', { cols: 80, rows: 24, taskId });
        });

        socket.on(`terminal:data:${taskId || 'default'}`, (data) => {
            xtermRef.current?.write(data);
        });

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            theme: { background: '#0f172a', foreground: '#f8fafc', cursor: '#3b82f6' },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        // Handle input
        term.onData((data) => {
            if (socketRef.current?.connected) {
                socketRef.current.emit(`terminal:input:${taskId || 'default'}`, data);
            }
        });

        const openTerminal = () => {
            term.open(terminalRef.current);
            xtermRef.current = term;
            fitAddonRef.current = fitAddon;
            setTimeout(() => {
                try {
                    fitAddon.fit();
                    const { cols, rows } = term;
                    socketRef.current?.emit(`terminal:resize:${taskId || 'default'}`, { cols, rows });
                } catch (e) { }
            }, 0);
        };

        let resizeObserver;

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
        <div className={styles.terminalContainer}>
            <div ref={terminalRef} className={styles.terminal} />
        </div>
    );
}
