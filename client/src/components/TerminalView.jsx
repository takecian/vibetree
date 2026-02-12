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
            // Request terminal session
            socket.emit('terminal:create', {
                cols: 80,
                rows: 24,
                taskId
            });
        });

        socket.on(`terminal:data:${taskId || 'default'}`, (data) => {
            xtermRef.current?.write(data);
        });

        // Initialize xterm
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#0f172a',
                foreground: '#f8fafc',
                cursor: '#3b82f6'
            },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        if (terminalRef.current) {
            term.open(terminalRef.current);
            fitAddon.fit();
            xtermRef.current = term;
            fitAddonRef.current = fitAddon;
        }

        term.onData((data) => {
            socket.emit(`terminal:input:${taskId || 'default'}`, data);
        });

        // Resize handler
        const handleResize = () => {
            fitAddon.fit();
            if (xtermRef.current) {
                const { cols, rows } = xtermRef.current;
                socket.emit(`terminal:resize:${taskId || 'default'}`, { cols, rows });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            socket.disconnect();
            term.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }, [taskId]);

    return (
        <div className={styles.terminalContainer}>
            <div ref={terminalRef} className={styles.terminal} />
        </div>
    );
}
