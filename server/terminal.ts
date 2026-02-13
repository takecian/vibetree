import * as pty from 'node-pty';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { Server, Socket } from 'socket.io'; // Import specific types from socket.io
import { Task, AppConfig } from './types'; // Import Task and AppConfig interfaces

// Define a type for the getTaskById function
type GetTaskByIdFunction = (taskId: string) => Promise<Task | undefined>;

function setupTerminal(io: Server, getState: () => AppConfig, getTaskById: GetTaskByIdFunction): void {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'zsh';
    const sessions: { [key: string]: pty.IPty } = {}; // Type the sessions object

    io.on('connection', (socket: Socket) => {
        socket.on('terminal:create', async ({ cols, rows, taskId }: { cols: number, rows: number, taskId: string }) => {
            const { repoPath } = getState();

            if (!repoPath) {
                socket.emit('terminal:error', 'Repository path not configured');
                return;
            }

            const termId = taskId || 'default';

            if (sessions[termId]) {
                sessions[termId].kill();
            }

            let workingDir = repoPath;
            const taskEnv: NodeJS.ProcessEnv = {}; // Environment variables for the task

            if (taskId && taskId !== 'default') {
                const task = await getTaskById(taskId);
                if (task) {
                    // Only inject details if the task is "in progress"
                    if (task.status === 'inprogress') {
                        taskEnv.TASK_ID = task.id;
                        taskEnv.TASK_TITLE = task.title;
                        taskEnv.TASK_DESCRIPTION = task.description;
                        taskEnv.TASK_STATUS = task.status;
                        console.log(`[Terminal] Injected task details for task ${task.id} into environment.`);
                    }

                    const worktreePath = path.join(repoPath, '.vibe-flow', 'worktrees', taskId);
                    if (fs.existsSync(worktreePath)) {
                        workingDir = worktreePath;
                    }
                }
            }

            // Fallback if workingDir doesn't exist
            if (!fs.existsSync(workingDir)) {
                console.warn(`Working directory ${workingDir} does not exist. Falling back to home directory.`);
                workingDir = os.homedir();
            }

            console.log(`[Terminal] Spawning ${shell} in ${workingDir}`);
            console.log(`[Terminal] Cols: ${cols}, Rows: ${rows}`);

            let ptyProcess: pty.IPty; // Type ptyProcess
            try {
                // Verify directory exists specifically before spawn
                try {
                    fs.accessSync(workingDir, fs.constants.R_OK | fs.constants.X_OK);
                } catch (err) {
                    console.error(`[Terminal] Directory not accessible: ${workingDir}`, err);
                    socket.emit('terminal:error', `Directory not accessible: ${workingDir}`);
                    return;
                }

                ptyProcess = pty.spawn(shell === 'zsh' ? '/bin/zsh' : shell, [], {
                    name: 'xterm-color',
                    cols: cols || 80,
                    rows: rows || 30,
                    cwd: workingDir,
                    env: { ...process.env, ...taskEnv } as { [key: string]: string } // Merge existing and task-specific envs
                });
            } catch (spawnError: any) {
                console.error('[Terminal] Spawn failed:', spawnError);
                socket.emit('terminal:error', 'Failed to spawn terminal process');
                return;
            }

            sessions[termId] = ptyProcess;

            ptyProcess.onData((data) => {
                socket.emit(`terminal:data:${termId}`, data);
            });

            socket.on(`terminal:input:${termId}`, (data: string) => {
                ptyProcess.write(data);
            });

            socket.on(`terminal:resize:${termId}`, ({ cols, rows }: { cols: number, rows: number }) => {
                ptyProcess.resize(cols, rows);
            });

            socket.on('disconnect', () => {
                // Cleanup if necessary
            });
        });
    });
}

export { setupTerminal };
