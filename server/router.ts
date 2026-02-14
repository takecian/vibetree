import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { Task } from './types';
import { createWorktree, runGit } from './git';
import { getTaskById as getTaskByIdUtil } from './tasks';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { saveConfig, loadConfig } from './config';

const execAsync = util.promisify(exec);

export const appRouter = router({
    // Config Procedures
    getConfig: publicProcedure.query(({ ctx }) => {
        return ctx.getState();
    }),
    updateConfig: publicProcedure
        .input(z.object({
            repoPath: z.string().optional(),
            aiTool: z.string().optional(),
            copyFiles: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const state = ctx.getState();
            if (input.repoPath !== undefined) {
                if (input.repoPath && !fs.existsSync(input.repoPath)) {
                    throw new Error('Path does not exist');
                }
                state.repoPath = input.repoPath || '';
            }
            if (input.aiTool !== undefined) state.aiTool = input.aiTool;
            if (input.copyFiles !== undefined) state.copyFiles = input.copyFiles;

            await saveConfig(state);
            return state;
        }),

    // Task Procedures
    getTasks: publicProcedure.query(async () => {
        const db = getDB();
        await db.read();
        return db.data.tasks;
    }),
    createTask: publicProcedure
        .input(z.object({
            title: z.string(),
            description: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            const db = getDB();
            await db.read();
            const newTask: Task = {
                id: uuidv4(),
                title: input.title,
                description: input.description || '',
                createdAt: new Date().toISOString(),
                branchName: `feature/task-${Date.now()}`
            };
            db.data.tasks.push(newTask);
            await db.write();

            // Handle side effects (worktree, terminal, AI)
            const { repoPath } = ctx.getState();
            if (repoPath && ctx.createWorktree && ctx.ensureTerminalForTask && ctx.runAiForTask) {
                try {
                    console.log(`[tRPC] Creating worktree for task ${newTask.id}`);
                    await ctx.createWorktree(repoPath, newTask.id, newTask.branchName || '');

                    console.log(`[tRPC] Ensuring terminal for task ${newTask.id}`);
                    await ctx.ensureTerminalForTask(newTask.id);

                    console.log(`[tRPC] Running AI for task ${newTask.id}`);
                    ctx.runAiForTask(newTask.id).catch(e => console.error(`[tRPC] runAiForTask error:`, e));
                } catch (e) {
                    console.error(`[tRPC] Side effects failed for task ${newTask.id}:`, e);
                }
            }

            return newTask;
        }),
    updateTask: publicProcedure
        .input(z.object({
            id: z.string(),
            updates: z.object({
                title: z.string().optional(),
                description: z.string().optional(),
            }),
        }))
        .mutation(async ({ input }) => {
            const db = getDB();
            await db.read();
            const taskIndex = db.data.tasks.findIndex((t: Task) => t.id === input.id);
            if (taskIndex > -1) {
                db.data.tasks[taskIndex] = { ...db.data.tasks[taskIndex], ...input.updates };
                await db.write();
                return db.data.tasks[taskIndex];
            } else {
                throw new Error('Task not found');
            }
        }),
    deleteTask: publicProcedure
        .input(z.string())
        .mutation(async ({ input }) => {
            const db = getDB();
            await db.read();
            db.data.tasks = db.data.tasks.filter((t: Task) => t.id !== input);
            await db.write();
            return { success: true };
        }),

    // Git Procedures
    getGitStatus: publicProcedure
        .input(z.object({ taskId: z.string().optional() }))
        .query(async ({ input, ctx }) => {
            const { repoPath } = ctx.getState();
            const cwd = input.taskId ? path.join(repoPath, '.vibetree', 'worktrees', input.taskId) : repoPath;
            const branch = await runGit('git branch --show-current', cwd, repoPath);
            const status = await runGit('git status --short', cwd, repoPath);
            return { branch, status };
        }),
    getGitDiff: publicProcedure
        .input(z.object({ taskId: z.string().optional() }))
        .query(async ({ input, ctx }) => {
            const { repoPath } = ctx.getState();
            const cwd = input.taskId ? path.join(repoPath, '.vibetree', 'worktrees', input.taskId) : repoPath;
            const diff = await runGit('git diff', cwd, repoPath);
            return { diff };
        }),
    createCommit: publicProcedure
        .input(z.object({
            taskId: z.string().optional(),
            message: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { repoPath } = ctx.getState();
            const cwd = input.taskId ? path.join(repoPath, '.vibetree', 'worktrees', input.taskId) : repoPath;
            await runGit('git add .', cwd, repoPath);
            await runGit(`git commit -m "${input.message}"`, cwd, repoPath);
            return { success: true };
        }),
    getWorktreePath: publicProcedure
        .input(z.object({ taskId: z.string() }))
        .query(({ input, ctx }) => {
            const { repoPath } = ctx.getState();
            const worktreePath = path.join(repoPath, '.vibetree', 'worktrees', input.taskId);
            return { path: worktreePath };
        }),

    // System Procedures
    openDirectory: publicProcedure
        .input(z.object({ path: z.string() }))
        .mutation(async ({ input }) => {
            let command: string;
            switch (os.platform()) {
                case 'darwin':
                    command = `open "${input.path}"`;
                    break;
                case 'win32':
                    command = `start "" "${input.path}"`;
                    break;
                default:
                    command = `xdg-open "${input.path}"`;
                    break;
            }
            await execAsync(command);
            return { success: true };
        }),
    pickFolder: publicProcedure.mutation(async () => {
        let command: string | undefined;
        if (os.platform() === 'darwin') {
            command = `osascript -e 'POSIX path of (choose folder with prompt "Select a Git Repository")'`;
        } else if (os.platform() === 'win32') {
            command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowDialog() | Out-Null; $f.SelectedPath"`;
        } else {
            throw new Error('Directory picker not supported on this platform');
        }

        const { stdout } = await execAsync(command);
        const resultPath = stdout.trim();
        return resultPath ? { path: resultPath } : { canceled: true };
    }),
    getAiTools: publicProcedure.query(async () => {
        const tools = ['claude', 'codex', 'gemini'];
        const results: Record<string, boolean> = {};
        const commonPaths = [
            '/opt/homebrew/bin',
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            (process.env.HOME || '') + '/.local/bin',
            (process.env.HOME || '') + '/bin',
        ];
        const envPath = process.env.PATH || '';
        const extendedPath = commonPaths.join(path.delimiter) + path.delimiter + envPath;

        for (const tool of tools) {
            let found = false;
            try {
                const cmd = os.platform() === 'win32' ? `where ${tool}` : `which ${tool}`;
                const { stdout } = await execAsync(cmd, { env: { ...process.env, PATH: extendedPath } });
                if (stdout.trim()) found = true;
            } catch { }

            if (!found) {
                for (const p of commonPaths) {
                    const binaryPath = path.join(p, tool + (os.platform() === 'win32' ? '.exe' : ''));
                    if (fs.existsSync(binaryPath)) { found = true; break; }
                }
            }
            results[tool] = found;
        }
        return results;
    }),
});

export type AppRouter = typeof appRouter;
