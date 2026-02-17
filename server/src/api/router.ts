import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { createWorktree, runGit, rebase, createPR, pushBranch, getBranchDiff, updatePR, getDefaultBranch, pullMainBranch, checkPRMergeStatus, hasChangesForPR } from '../services/git';
import { generatePRSummary } from '../services/ai';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { saveConfig } from '../config';
import {
    getRepositories,
    getRepositoryByPath,
    addRepository,
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    deleteRepository,
    normalizePath
} from '../services/db';

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
                const normalized = normalizePath(input.repoPath || '');
                state.repoPath = normalized;
                if (normalized) {
                    addRepository(normalized, input.copyFiles);
                }
            }
            if (input.aiTool !== undefined) state.aiTool = input.aiTool;
            if (input.copyFiles !== undefined) {
                state.copyFiles = input.copyFiles;
                // Update copyFiles for active repo if it exists
                const repo = getRepositoryByPath(state.repoPath);
                if (repo) {
                    const { updateRepository } = await import('../services/db');
                    updateRepository(repo.id, { copyFiles: input.copyFiles });
                }
            }

            await saveConfig(state);
            return state;
        }),

    getRepositories: publicProcedure.query(async () => {
        return getRepositories();
    }),

    addRepository: publicProcedure
        .input(z.object({ path: z.string(), copyFiles: z.string().optional() }))
        .mutation(async ({ input }) => {
            return addRepository(input.path, input.copyFiles);
        }),
    updateRepository: publicProcedure
        .input(z.object({
            id: z.string(),
            updates: z.object({
                path: z.string().optional(),
                copyFiles: z.string().optional(),
            }),
        }))
        .mutation(async ({ input }) => {
            const { updateRepository } = await import('../services/db');
            return updateRepository(input.id, input.updates);
        }),
    deleteRepository: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            deleteRepository(input.id);
            return { success: true };
        }),

    // Task Procedures
    getTasks: publicProcedure
        .input(z.object({ repoPath: z.string() }))
        .query(async ({ input }) => {
            const repo = getRepositoryByPath(input.repoPath);
            if (!repo) return [];
            return getTasks(repo.id);
        }),
    createTask: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            title: z.string(),
            description: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            let repo = getRepositoryByPath(input.repoPath);
            if (!repo) {
                repo = addRepository(input.repoPath);
            }

            const newTask = createTask(repo.id, {
                title: input.title,
                description: input.description || '',
                branchName: `feature/task-${Date.now()}`
            });

            // Handle side effects (worktree, terminal, AI)
            if (input.repoPath && ctx.createWorktree && ctx.ensureTerminalForTask && ctx.runAiForTask) {
                try {
                    console.log(`[tRPC] Creating worktree for task ${newTask.id} in ${input.repoPath}`);
                    await ctx.createWorktree(input.repoPath, newTask.id, newTask.branchName || '', repo.copyFiles || '');

                    console.log(`[tRPC] Ensuring terminal for task ${newTask.id}`);
                    await ctx.ensureTerminalForTask(newTask.id, input.repoPath);

                    console.log(`[tRPC] Running AI for task ${newTask.id}`);
                    ctx.runAiForTask(newTask.id, input.repoPath).catch(e => console.error(`[tRPC] runAiForTask error:`, e));
                } catch (e) {
                    console.error(`[tRPC] Side effects failed for task ${newTask.id}:`, e);
                }
            }

            return newTask;
        }),
    updateTask: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            id: z.string(),
            updates: z.object({
                title: z.string().optional(),
                description: z.string().optional(),
            }),
        }))
        .mutation(async ({ input }) => {
            const task = getTaskById(input.id);
            if (!task) throw new Error('Task not found');
            return updateTask(input.id, input.updates);
        }),
    deleteTask: publicProcedure
        .input(z.object({ repoPath: z.string(), taskId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const task = getTaskById(input.taskId);
            if (!task) throw new Error('Task not found');

            // Cleanup side effects
            if (ctx.shutdownTerminalForTask) {
                console.log(`[tRPC] Shutting down terminal for task ${input.taskId}`);
                await ctx.shutdownTerminalForTask(input.taskId);
            }
            if (input.repoPath && ctx.removeWorktree) {
                console.log(`[tRPC] Removing worktree and branch for task ${input.taskId} (${task.branchName})`);
                try {
                    await ctx.removeWorktree(input.repoPath, input.taskId, task.branchName);
                } catch (e) {
                    console.error(`[tRPC] Failed to remove worktree/branch:`, e);
                }
            }

            deleteTask(input.taskId);
            return { success: true };
        }),

    // Git Procedures
    getGitStatus: publicProcedure
        .input(z.object({ repoPath: z.string(), taskId: z.string().optional() }))
        .query(async ({ input }) => {
            const cwd = input.taskId ? path.join(input.repoPath, '.vibetree', 'worktrees', input.taskId) : input.repoPath;
            const branch = await runGit('git branch --show-current', cwd, input.repoPath);
            const status = await runGit('git status --short', cwd, input.repoPath);
            return { branch, status };
        }),
    getGitDiff: publicProcedure
        .input(z.object({ repoPath: z.string(), taskId: z.string().optional() }))
        .query(async ({ input }) => {
            const cwd = input.taskId ? path.join(input.repoPath, '.vibetree', 'worktrees', input.taskId) : input.repoPath;
            const diff = await runGit('git diff', cwd, input.repoPath);
            return { diff };
        }),
    createCommit: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            taskId: z.string().optional(),
            message: z.string(),
        }))
        .mutation(async ({ input }) => {
            const cwd = input.taskId ? path.join(input.repoPath, '.vibetree', 'worktrees', input.taskId) : input.repoPath;
            await runGit('git add .', cwd, input.repoPath);
            await runGit(`git commit -m "${input.message}"`, cwd, input.repoPath);
            return { success: true };
        }),
    getWorktreePath: publicProcedure
        .input(z.object({ repoPath: z.string(), taskId: z.string() }))
        .query(({ input }) => {
            const worktreePath = path.join(input.repoPath, '.vibetree', 'worktrees', input.taskId);
            return { path: worktreePath };
        }),

    rebase: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            taskId: z.string(),
            baseBranch: z.string(),
        }))
        .mutation(async ({ input }) => {
            return rebase(input.repoPath, input.taskId, input.baseBranch);
        }),

    createPR: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            taskId: z.string(),
            title: z.string(),
            body: z.string().optional(),
            baseBranch: z.string(),
        }))
        .mutation(async ({ input }) => {
            const result = await createPR(input.repoPath, input.taskId, {
                title: input.title,
                body: input.body,
                baseBranch: input.baseBranch,
            });

            if (result.success && result.url) {
                // Save PR URL to task
                updateTask(input.taskId, { prUrl: result.url });
            }

            return result;
        }),

    push: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            taskId: z.string(),
            commitMessage: z.string(),
        }))
        .mutation(async ({ input }) => {
            return pushBranch(input.repoPath, input.taskId, input.commitMessage);
        }),

    syncPRWithAI: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            taskId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            const state = ctx.getState();
            if (!state.aiTool) throw new Error("AI tool not configured");

            const baseBranch = await getDefaultBranch(input.repoPath);
            const diff = await getBranchDiff(input.repoPath, input.taskId, baseBranch);

            if (!diff) return { success: true, message: "No changes found" };

            const summary = await generatePRSummary(state.aiTool, diff);
            return updatePR(input.repoPath, input.taskId, summary);
        }),

    getDefaultBranch: publicProcedure
        .input(z.object({ repoPath: z.string() }))
        .query(async ({ input }) => {
            return getDefaultBranch(input.repoPath);
        }),

    pullMainBranch: publicProcedure
        .input(z.object({ repoPath: z.string() }))
        .mutation(async ({ input }) => {
            return pullMainBranch(input.repoPath);
        }),

    checkPRMergeStatus: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            taskId: z.string(),
        }))
        .mutation(async ({ input }) => {
            const task = getTaskById(input.taskId);
            if (!task || !task.prUrl) {
                return { merged: false };
            }

            const merged = await checkPRMergeStatus(input.repoPath, task.prUrl);
            
            // Update the task's prMerged field in the database
            if (merged !== task.prMerged) {
                updateTask(input.taskId, { prMerged: merged });
            }

            return { merged };
        }),

    hasChangesForPR: publicProcedure
        .input(z.object({
            repoPath: z.string(),
            taskId: z.string(),
        }))
        .query(async ({ input }) => {
            const baseBranch = await getDefaultBranch(input.repoPath);
            const hasChanges = await hasChangesForPR(input.repoPath, input.taskId, baseBranch);
            return { hasChanges };
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
    checkVSCode: publicProcedure.query(async () => {
        // Check if VS Code is installed by looking for 'code' command
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

        let found = false;
        try {
            const cmd = os.platform() === 'win32' ? 'where code' : 'which code';
            const { stdout } = await execAsync(cmd, { env: { ...process.env, PATH: extendedPath } });
            const output = stdout.trim();
            // On Windows, 'where' may return multiple paths; check if at least one exists
            if (output) {
                const firstPath = output.split('\n')[0].trim();
                if (firstPath) found = true;
            }
        } catch { }

        if (!found) {
            for (const p of commonPaths) {
                const binaryPath = path.join(p, 'code' + (os.platform() === 'win32' ? '.exe' : ''));
                if (fs.existsSync(binaryPath)) { found = true; break; }
            }
        }

        return { installed: found };
    }),
    openVSCode: publicProcedure
        .input(z.object({ path: z.string() }))
        .mutation(async ({ input }) => {
            // Open VS Code with the specified directory
            // Use array format to avoid shell injection issues
            let command: string;
            let args: string[];
            
            if (os.platform() === 'win32') {
                // On Windows, we need to use cmd /c to execute the code command
                command = 'cmd';
                args = ['/c', 'code', input.path];
            } else {
                command = 'code';
                args = [input.path];
            }
            
            try {
                const { spawn } = await import('child_process');
                const child = spawn(command, args, { 
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref(); // Allow parent to exit independently
                return { success: true };
            } catch (error: any) {
                console.error('Failed to open VS Code:', error);
                throw new Error(`Failed to open VS Code: ${error.message}`);
            }
        }),
});

export type AppRouter = typeof appRouter;
