import * as pty from 'node-pty';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { Server, Socket } from 'socket.io';
import { Task, AppConfig } from './types';

type GetTaskByIdFunction = (taskId: string) => Promise<Task | undefined>;

const SHELL_INITIALIZATION_DELAY_MS = 800;
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'zsh';

interface TerminalSession {
    pty: pty.IPty;
    socket: Socket | null;
}

function escapeForShellDoubleQuoted(s: string): string {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')
        .replace(/!/g, '\\!')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

function buildAiPrompt(task: Task): string {
    const parts = [`Task: ${task.title}`];
    if (task.description?.trim()) {
        parts.push('', task.description.trim());
    }
    return parts.join('\n');
}

function setupTerminal(io: Server, getState: () => AppConfig, getTaskById: GetTaskByIdFunction) {
    const sessions: { [key: string]: TerminalSession } = {};

    function spawnPty(workingDir: string, termId: string, taskEnv: NodeJS.ProcessEnv = {}): pty.IPty {
        const ptyProcess = pty.spawn(shell === 'zsh' ? '/bin/zsh' : shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: workingDir,
            env: { ...process.env, ...taskEnv } as { [key: string]: string }
        });
        const session: TerminalSession = { pty: ptyProcess, socket: null };
        sessions[termId] = session;
        ptyProcess.onData((data) => {
            if (session.socket) session.socket.emit(`terminal:data:${termId}`, data);
        });
        return ptyProcess;
    }

    function attachSocketToSession(socket: Socket, session: TerminalSession, termId: string, cols?: number, rows?: number): void {
        session.socket = socket;
        
        // Remove any existing listeners for this termId to prevent duplicates
        socket.removeAllListeners(`terminal:input:${termId}`);
        socket.removeAllListeners(`terminal:resize:${termId}`);
        socket.removeAllListeners('disconnect');
        
        socket.on(`terminal:input:${termId}`, (data: string) => {
            session.pty.write(data);
        });
        socket.on(`terminal:resize:${termId}`, ({ cols: c, rows: r }: { cols: number; rows: number }) => {
            session.pty.resize(c || 80, r || 30);
        });
        socket.on('disconnect', () => {
            session.socket = null;
        });
        if (cols && rows) session.pty.resize(cols, rows);
    }

    /** Create terminal for a task when task is created (worktree must already exist). */
    async function ensureTerminalForTask(taskId: string): Promise<void> {
        if (sessions[taskId]) return;
        const { repoPath } = getState();
        if (!repoPath) return;
        const worktreePath = path.join(repoPath, '.vibe-flow', 'worktrees', taskId);
        if (!fs.existsSync(worktreePath)) return;
        try {
            fs.accessSync(worktreePath, fs.constants.R_OK | fs.constants.X_OK);
        } catch {
            return;
        }
        spawnPty(worktreePath, taskId);
        console.log(`[Terminal] Created terminal for task ${taskId} (worktree: ${worktreePath})`);
    }

    /** Run AI tool with task context (call when task is moved to in progress). */
    async function runAiForTask(taskId: string): Promise<void> {
        const session = sessions[taskId];
        if (!session) return;
        const { aiTool } = getState();
        if (!aiTool) return;
        const safeAiToolPattern = /^[a-zA-Z0-9._-]+$/;
        if (!safeAiToolPattern.test(aiTool)) return;
        const task = await getTaskById(taskId);
        if (!task || task.status !== 'inprogress') return;
        const prompt = buildAiPrompt(task);
        const escaped = escapeForShellDoubleQuoted(prompt);
        const command = `${aiTool} "${escaped}"\n`;
        setTimeout(() => {
            try {
                session.pty.write(command);
                console.log(`[Terminal] Ran ${aiTool} with task context for task ${taskId}`);
            } catch (e) {
                console.error('[Terminal] Failed to run AI command:', e);
            }
        }, SHELL_INITIALIZATION_DELAY_MS);
    }

    io.on('connection', (socket: Socket) => {
        socket.on('terminal:create', async ({ cols, rows, taskId }: { cols: number; rows: number; taskId: string }) => {
            const { repoPath } = getState();
            if (!repoPath) {
                socket.emit('terminal:error', 'Repository path not configured');
                return;
            }

            const termId = taskId || 'default';
            let session = sessions[termId];

            if (session) {
                // Reuse existing terminal: attach this socket
                attachSocketToSession(socket, session, termId, cols, rows);
                return;
            }

            // No existing session: spawn new (e.g. old task or default)
            let workingDir = repoPath;
            const taskEnv: NodeJS.ProcessEnv = {};

            if (taskId && taskId !== 'default') {
                const task = await getTaskById(taskId);
                if (task) {
                    if (task.status === 'inprogress') {
                        taskEnv.TASK_ID = task.id;
                        taskEnv.TASK_TITLE = task.title;
                        taskEnv.TASK_DESCRIPTION = task.description;
                        taskEnv.TASK_STATUS = task.status;
                    }
                    const worktreePath = path.join(repoPath, '.vibe-flow', 'worktrees', taskId);
                    if (fs.existsSync(worktreePath)) workingDir = worktreePath;
                }
            }

            if (!fs.existsSync(workingDir)) {
                console.warn(`[Terminal] Working dir ${workingDir} missing, using home`);
                workingDir = os.homedir();
            }

            try {
                fs.accessSync(workingDir, fs.constants.R_OK | fs.constants.X_OK);
            } catch (err: any) {
                socket.emit('terminal:error', `Directory not accessible: ${workingDir}`);
                return;
            }

            console.log(`[Terminal] Spawning ${shell} in ${workingDir}`);
            const ptyProcess = spawnPty(workingDir, termId, taskEnv);
            session = sessions[termId];
            attachSocketToSession(socket, session, termId, cols, rows);
        });
    });

    return { ensureTerminalForTask, runAiForTask };
}

export { setupTerminal };
