import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { Request, Response, Application } from 'express';
import { AppConfig } from './types'; // Assuming AppConfig is defined in types.ts

const execAsync = util.promisify(exec);

interface GitState {
    repoPath: string;
}

function setupGitRoutes(app: Application, getState: () => AppConfig): void {

    // Helper to run git commands
    async function runGit(command: string, cwd?: string): Promise<string> {
        const { repoPath } = getState();
        const workingDir = cwd || repoPath;

        if (!workingDir) throw new Error("Repository path not set");

        try {
            const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
            return stdout.trim();
        } catch (error: any) {
            console.error(`Git error: ${command}`, error);
            throw new Error(`Git command failed: ${error.message}`);
        }
    }

    app.get('/api/git/status', async (req: Request, res: Response) => {
        try {
            const branch = await runGit('git branch --show-current');
            const status = await runGit('git status --short');
            res.json({ branch, status });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/git/worktree', async (req: Request, res: Response) => {
        const { branchName, taskId } = req.body;
        const { repoPath, copyFiles } = getState();

        try {
            const result = await createWorktree(repoPath, taskId, branchName, copyFiles);
            res.json(result);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/git/diff', async (req: Request, res: Response) => {
        const { taskId } = req.query;
        const { repoPath } = getState();
        if (!repoPath) return res.status(400).json({ error: 'Repository not selected' });

        const cwd = taskId ? path.join(repoPath, '.vibe-flow', 'worktrees', taskId as string) : repoPath;

        try {
            const diff = await runGit('git diff', cwd);
            res.json({ diff });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/git/commit', async (req: Request, res: Response) => {
        const { taskId, message } = req.body;
        const { repoPath } = getState();
        if (!repoPath) return res.status(400).json({ error: 'Repository not selected' });

        const cwd = taskId ? path.join(repoPath, '.vibe-flow', 'worktrees', taskId as string) : repoPath;

        try {
            await runGit('git add .', cwd);
            await runGit(`git commit -m "${message}"`, cwd);
            res.json({ success: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });
}

// Helper function exposed for other modules
async function createWorktree(
    repoPath: string,
    taskId: string,
    branchName: string,
    copyFiles?: string
): Promise<{ success: boolean; path: string; message?: string }> {
    if (!repoPath) throw new Error("Repository not selected");
    const worktreePath = path.join(repoPath, '.vibe-flow', 'worktrees', taskId);

    if (fs.existsSync(worktreePath)) {
        return { success: true, path: worktreePath, message: 'Worktree already exists' };
    }

    try {
        let createBranchFlag = '';
        try {
            await execAsync(`git rev-parse --verify ${branchName}`, { cwd: repoPath });
        } catch (e) {
            createBranchFlag = `-b ${branchName}`;
        }
        await execAsync(`git worktree add ${createBranchFlag} "${worktreePath}"`, { cwd: repoPath });

        // Copy configured files (e.g. .env) into worktree
        if (copyFiles && typeof copyFiles === 'string') {
            const entries = copyFiles.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            for (const entry of entries) {
                const srcPath = path.isAbsolute(entry) ? entry : path.join(repoPath, entry);
                const destPath = path.join(worktreePath, path.basename(entry));
                if (!fs.existsSync(srcPath)) {
                    console.warn(`[Worktree] Copy skipped (not found): ${srcPath}`);
                    continue;
                }
                // Only copy files, not directories
                if (!fs.statSync(srcPath).isFile()) {
                    console.warn(`[Worktree] Copy skipped (not a file): ${srcPath}`);
                    continue;
                }
                try {
                    fs.copyFileSync(srcPath, destPath);
                    console.log(`[Worktree] Copied ${path.basename(entry)} to worktree`);
                } catch (copyErr: any) {
                    console.warn(`[Worktree] Failed to copy ${entry}:`, copyErr.message);
                }
            }
        }

        return { success: true, path: worktreePath };
    } catch (e: any) {
        console.error("Worktree creation failed:", e);
        throw e;
    }
}

export { setupGitRoutes, createWorktree };
