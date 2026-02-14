import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { Request, Response, Application } from 'express';
import { AppConfig } from '../types'; // Assuming AppConfig is defined in types.ts

const execAsync = util.promisify(exec);

interface GitState {
    repoPath: string;
}

// Helper to run git commands
async function runGit(command: string, cwd: string, repoPath: string): Promise<string> {
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

// Helper function exposed for other modules
async function createWorktree(
    repoPath: string,
    taskId: string,
    branchName: string,
    copyFiles?: string
): Promise<{ success: boolean; path: string; message?: string }> {
    if (!repoPath) throw new Error("Repository not selected");
    const worktreePath = path.join(repoPath, '.vibetree', 'worktrees', taskId);

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

async function removeWorktree(repoPath: string, taskId: string, branchName?: string): Promise<{ success: boolean; message?: string }> {
    if (!repoPath) throw new Error("Repository not selected");
    const worktreePath = path.join(repoPath, '.vibetree', 'worktrees', taskId);

    try {
        if (fs.existsSync(worktreePath)) {
            await execAsync(`git worktree remove --force "${worktreePath}"`, { cwd: repoPath });
            console.log(`[Git] Removed worktree at ${worktreePath}`);
        }

        if (branchName) {
            try {
                await execAsync(`git branch -D "${branchName}"`, { cwd: repoPath });
                console.log(`[Git] Deleted branch ${branchName}`);
            } catch (branchErr: any) {
                console.warn(`[Git] Failed to delete branch ${branchName}: ${branchErr.message}`);
            }
        }
        return { success: true };
    } catch (e: any) {
        console.error("Worktree/Branch removal failed:", e);
        throw e;
    }
}

export { createWorktree, runGit, removeWorktree };
