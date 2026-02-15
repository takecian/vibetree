import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TerminalSession {
    terminal: Terminal;
    socket: Socket;
    fitAddon: FitAddon;
}

interface TerminalContextType {
    getTerminalSession: (taskId: string, repoPath: string) => TerminalSession;
    destroyTerminalSession: (taskId: string) => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: React.ReactNode }) {
    const sessionsRef = useRef<Map<string, TerminalSession>>(new Map());

    const getTerminalSession = useCallback((taskId: string, repoPath: string): TerminalSession => {
        if (sessionsRef.current.has(taskId)) {
            const existingSession = sessionsRef.current.get(taskId)!;
            // If socket is disconnected, reconnect it
            if (!existingSession.socket.connected) {
                console.log('[Terminal] Reconnecting socket for task:', taskId);
                existingSession.socket.connect();
            }
            return existingSession;
        }

        // Initialize Socket
        const socket: Socket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        // Initialize xterm
        const terminal: Terminal = new Terminal({
            cursorBlink: true,
            theme: { background: '#0f172a', foreground: '#f8fafc', cursor: '#3b82f6' },
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 14
        });

        const fitAddon: FitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        socket.on('connect', () => {
            console.log('[Terminal] Socket connected for task:', taskId);
            socket.emit('terminal:create', { cols: 80, rows: 24, taskId, repoPath });
        });

        socket.on(`terminal:data:${taskId || 'default'}`, (data: string) => {
            terminal.write(data);
        });

        // Handle reconnection with buffered data
        socket.on(`terminal:reconnect:${taskId || 'default'}`, (bufferedData: string) => {
            console.log('[Terminal] Reconnected - receiving buffered data');
            terminal.write(bufferedData);
        });

        socket.on('terminal:error', (message: string) => {
            console.error('Terminal error from server:', message);
            terminal.write(`\r\nError: ${message}\r\n`);
        });

        socket.on('disconnect', () => {
            console.log('[Terminal] Socket disconnected for task:', taskId);
        });

        terminal.onData((data: string) => {
            if (socket.connected) {
                socket.emit(`terminal:input:${taskId || 'default'}`, data);
            }
        });

        const session = { terminal, socket, fitAddon };
        sessionsRef.current.set(taskId, session);
        return session;
    }, []);

    const destroyTerminalSession = useCallback((taskId: string) => {
        const session = sessionsRef.current.get(taskId);
        if (session) {
            session.socket.disconnect();
            session.terminal.dispose();
            sessionsRef.current.delete(taskId);
        }
    }, []);

    return (
        <TerminalContext.Provider value={{ getTerminalSession, destroyTerminalSession }}>
            {children}
        </TerminalContext.Provider>
    );
}

export function useTerminals() {
    const context = useContext(TerminalContext);
    if (!context) {
        throw new Error('useTerminals must be used within a TerminalProvider');
    }
    return context;
}
