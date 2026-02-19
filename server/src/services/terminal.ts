import * as pty from 'node-pty';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { Server, Socket } from 'socket.io';
import { Task, AppConfig } from '../types';
import { getRepositoryByPath } from './db';

type GetTaskByIdFunction = (taskId: string, repoPath: string) => Promise<Task | undefined>;

const SHELL_INITIALIZATION_DELAY_MS = 800;
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'zsh';
const BUFFER_MAX_SIZE = 1000;  // Maximum number of buffer entries to keep

interface TerminalSession {
    pty: pty.IPty;
    socket: Socket | null;
    buffer: string[];  // Store recent output for reconnection
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

function ensureSpawnHelperExecutable() {
    if (os.platform() !== 'darwin') return;

    try {
        // node-pty's unixTerminal.js resolves helperPath relative to __dirname (which is in node_modules/node-pty/lib)
        // We look for where node-pty is installed by using require.resolve
        const nodePtyDir = path.dirname(require.resolve('node-pty/package.json'));

        const possiblePaths = [
            path.join(nodePtyDir, 'prebuilds', `darwin-${os.arch()}`, 'spawn-helper'),
            path.join(nodePtyDir, 'build', 'Release', 'spawn-helper'),
        ];

        for (const helperPath of possiblePaths) {
            if (fs.existsSync(helperPath)) {
                const stats = fs.statSync(helperPath);
                // Check if it's already executable (0o111)
                if ((stats.mode & 0o111) === 0) {
                    console.log(`[Terminal] Setting execute permission on node-pty helper: ${helperPath}`);
                    fs.chmodSync(helperPath, 0o755);
                }
            }
        }
    } catch (err) {
        console.warn('[Terminal] Failed to ensure node-pty helper is executable:', err);
    }
}

function resolveTaskWorktreePath(repoPath: string, taskId: string): string {
    const repo = getRepositoryByPath(repoPath);
    const baseWorktreePath = repo?.worktreePath || path.join(repoPath, '.vibetree', 'worktrees');
    return path.join(baseWorktreePath, taskId);
}

function setupTerminal(io: Server, getState: () => AppConfig, getTaskById: GetTaskByIdFunction) {
    ensureSpawnHelperExecutable();
    const sessions: { [key: string]: TerminalSession } = {};

    function spawnPty(workingDir: string, termId: string, taskEnv: NodeJS.ProcessEnv = {}): pty.IPty {
        const ptyProcess = pty.spawn(shell === 'zsh' ? '/bin/zsh' : shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: workingDir,
            env: { ...process.env, ...taskEnv } as { [key: string]: string }
        });
        const session: TerminalSession = { pty: ptyProcess, socket: null, buffer: [] };
        sessions[termId] = session;
        ptyProcess.onData((data) => {
            // Store in buffer for reconnection
            session.buffer.push(data);
            if (session.buffer.length > BUFFER_MAX_SIZE) {
                session.buffer.shift();  // Remove oldest entry
            }

            // Send to connected socket
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

        // Send buffered data to reconnecting client
        if (session.buffer.length > 0) {
            console.log(`[Terminal] Sending ${session.buffer.length} buffered entries to reconnecting client for ${termId}`);
            socket.emit(`terminal:reconnect:${termId}`, session.buffer.join(''));
        }
    }

    /** Create terminal for a task when task is created (worktree must already exist). */
    async function ensureTerminalForTask(taskId: string, repoPath: string): Promise<void> {
        if (sessions[taskId]) return;
        if (!repoPath) return;
        const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
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
    async function runAiForTask(taskId: string, repoPath: string): Promise<void> {
        const session = sessions[taskId];
        if (!session) return;
        const { aiTool } = getState();
        if (!aiTool) return;
        const safeAiToolPattern = /^[a-zA-Z0-9._-]+$/;
        if (!safeAiToolPattern.test(aiTool)) return;
        const task = await getTaskById(taskId, repoPath);
        if (!task) return;
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
        socket.on('terminal:create', async ({ cols, rows, taskId, repoPath }: { cols: number; rows: number; taskId: string; repoPath: string }) => {
            if (!repoPath) {
                socket.emit('terminal:error', 'Repository path not provided');
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
                const task = await getTaskById(taskId, repoPath);
                if (task) {
                    taskEnv.TASK_ID = task.id;
                    taskEnv.TASK_TITLE = task.title;
                    taskEnv.TASK_DESCRIPTION = task.description;
                    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
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
            spawnPty(workingDir, termId, taskEnv);
            session = sessions[termId];
            attachSocketToSession(socket, session, termId, cols, rows);
        });
    });

    async function shutdownTerminalForTask(taskId: string): Promise<void> {
        const session = sessions[taskId];
        if (!session) return;

        console.log(`[Terminal] Shutting down terminal for task ${taskId}`);
        try {
            session.pty.kill();
        } catch (e) {
            console.error(`[Terminal] Error killing PTY for task ${taskId}:`, e);
        }
        delete sessions[taskId];
    }

    return { ensureTerminalForTask, runAiForTask, shutdownTerminalForTask };
}

export { setupTerminal };
