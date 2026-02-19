import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { Request, Response, Application } from 'express';
import { AppConfig } from '../types'; // Assuming AppConfig is defined in types.ts
import { getRepositoryByPath } from './db';

const execAsync = util.promisify(exec);

interface GitState {
    repoPath: string;
}

function resolveTaskWorktreePath(repoPath: string, taskId: string): string {
    const repo = getRepositoryByPath(repoPath);
    const baseWorktreePath = repo?.worktreePath || path.join(repoPath, '.vibetree', 'worktrees');
    return path.join(baseWorktreePath, taskId);
}

// Helper to validate and sanitize branch names for git commands
function sanitizeBranchName(branchName: string): string {
    // Git branch names can contain alphanumeric characters, slashes, hyphens, underscores, and dots
    // but should not contain spaces, special shell characters, or start with a dot or slash
    const sanitized = branchName.replace(/[^a-zA-Z0-9/_.-]/g, '');
    if (sanitized !== branchName) {
        throw new Error(`Invalid branch name: ${branchName}`);
    }
    // Reject branch names with consecutive dots (path traversal risk)
    if (sanitized.includes('..')) {
        throw new Error(`Branch name cannot contain consecutive dots: ${branchName}`);
    }
    if (sanitized.startsWith('.') || sanitized.startsWith('/')) {
        throw new Error(`Branch name cannot start with . or /: ${branchName}`);
    }
    return sanitized;
}

// Helper to run git commands
async function runGit(command: string, cwd: string, repoPath: string, options?: { maxBuffer?: number }): Promise<string> {
    const workingDir = cwd || repoPath;

    if (!workingDir) throw new Error("Repository path not set");

    try {
        const execOptions: { cwd: string; maxBuffer?: number } = { cwd: workingDir };
        if (options?.maxBuffer) {
            execOptions.maxBuffer = options.maxBuffer;
        }
        const { stdout } = await execAsync(command, execOptions);
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
    copyFiles?: string,
    worktreePath?: string
): Promise<{ success: boolean; path: string; message?: string }> {
    if (!repoPath) throw new Error("Repository not selected");
    
    // Use custom worktree path if provided, otherwise use default
    const baseWorktreePath = worktreePath || path.join(repoPath, '.vibetree', 'worktrees');
    const fullWorktreePath = path.join(baseWorktreePath, taskId);

    if (fs.existsSync(fullWorktreePath)) {
        return { success: true, path: fullWorktreePath, message: 'Worktree already exists' };
    }

    try {
        // Ensure the base worktree directory exists
        if (!fs.existsSync(baseWorktreePath)) {
            fs.mkdirSync(baseWorktreePath, { recursive: true });
        }

        let createBranchFlag = '';
        try {
            await execAsync(`git rev-parse --verify ${branchName}`, { cwd: repoPath });
        } catch (e) {
            createBranchFlag = `-b ${branchName}`;
        }
        await execAsync(`git worktree add ${createBranchFlag} "${fullWorktreePath}"`, { cwd: repoPath });

        // Copy configured files (e.g. .env) into worktree
        if (copyFiles && typeof copyFiles === 'string') {
            const entries = copyFiles.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
            for (const entry of entries) {
                const srcPath = path.isAbsolute(entry) ? entry : path.join(repoPath, entry);
                const destPath = path.join(fullWorktreePath, path.basename(entry));
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

        return { success: true, path: fullWorktreePath };
    } catch (e: any) {
        console.error("Worktree creation failed:", e);
        throw e;
    }
}

async function removeWorktree(repoPath: string, taskId: string, branchName?: string, worktreePath?: string): Promise<{ success: boolean; message?: string }> {
    if (!repoPath) throw new Error("Repository not selected");
    
    // Use custom worktree path if provided, otherwise use default
    const baseWorktreePath = worktreePath || path.join(repoPath, '.vibetree', 'worktrees');
    const fullWorktreePath = path.join(baseWorktreePath, taskId);

    try {
        if (fs.existsSync(fullWorktreePath)) {
            await execAsync(`git worktree remove --force "${fullWorktreePath}"`, { cwd: repoPath });
            console.log(`[Git] Removed worktree at ${fullWorktreePath}`);
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

async function rebase(repoPath: string, taskId: string, baseBranch: string): Promise<{ success: boolean; message?: string }> {
    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
    if (!fs.existsSync(worktreePath)) {
        throw new Error("Worktree does not exist");
    }
    const sanitizedBranch = sanitizeBranchName(baseBranch);
    await runGit(`git rebase ${sanitizedBranch}`, worktreePath, repoPath);
    return { success: true };
}

async function createPR(repoPath: string, taskId: string, prData: { title: string; body?: string; baseBranch: string }): Promise<{ success: boolean; url?: string; message?: string }> {
    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
    if (!fs.existsSync(worktreePath)) {
        throw new Error("Worktree does not exist");
    }

    // Stage and commit changes first
    try {
        await runGit('git add .', worktreePath, repoPath);
        const status = await runGit('git status --porcelain', worktreePath, repoPath);
        if (status) {
            await runGit(`git commit -m ${JSON.stringify(prData.title)}`, worktreePath, repoPath);
        }
    } catch (e: any) {
        console.warn(`Failed to stage/commit: ${e.message}`);
        // Continue anyway, maybe it's already committed
    }

    // Push branch
    try {
        await runGit('git push origin HEAD', worktreePath, repoPath);
    } catch (e: any) {
        throw new Error(`Failed to push branch: ${e.message}`);
    }

    // Create PR using gh CLI
    try {
        const bodyArg = prData.body ? `--body ${JSON.stringify(prData.body)}` : '';
        const titleArg = `--title ${JSON.stringify(prData.title)}`;
        const command = `gh pr create ${titleArg} ${bodyArg} --base ${JSON.stringify(prData.baseBranch)}`;
        const output = await runGit(command, worktreePath, repoPath);

        // Extract URL - usually it's the last line of output
        const lines = output.split('\n');
        const url = lines[lines.length - 1].trim();
        return { success: true, url };
    } catch (e: any) {
        throw new Error(`Failed to create PR: ${e.message}`);
    }
}

async function stageAndCommit(worktreePath: string, repoPath: string, commitMessage: string): Promise<void> {
    await runGit('git add .', worktreePath, repoPath);
    const status = await runGit('git status --porcelain', worktreePath, repoPath);
    if (status) {
        await runGit(`git commit -m ${JSON.stringify(commitMessage)}`, worktreePath, repoPath);
    }
}

async function pushBranch(repoPath: string, taskId: string, commitMessage: string): Promise<{ success: boolean; message?: string }> {
    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
    if (!fs.existsSync(worktreePath)) {
        throw new Error("Worktree does not exist");
    }

    try {
        await stageAndCommit(worktreePath, repoPath, commitMessage);
        await runGit('git push origin HEAD', worktreePath, repoPath);
        return { success: true };
    } catch (e: any) {
        // Check if push was rejected due to remote changes
        // Note: Git does not provide structured error codes for push rejections.
        // We check for common error message patterns that indicate the remote has
        // diverged. These patterns are consistent across git versions and locales.
        const errorMessage = e.message || '';
        if (errorMessage.includes('rejected') || errorMessage.includes('non-fast-forward') || errorMessage.includes('fetch first')) {
            const error: any = new Error('Push was rejected because the remote contains work that you do not have locally');
            error.code = 'PUSH_REJECTED_REMOTE_CHANGES';
            throw error;
        }
        throw new Error(`Failed to push: ${e.message}`);
    }
}

async function pushBranchForce(repoPath: string, taskId: string, commitMessage: string): Promise<{ success: boolean; message?: string }> {
    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
    if (!fs.existsSync(worktreePath)) {
        throw new Error("Worktree does not exist");
    }

    try {
        await stageAndCommit(worktreePath, repoPath, commitMessage);
        await runGit('git push --force origin HEAD', worktreePath, repoPath);
        return { success: true };
    } catch (e: any) {
        throw new Error(`Failed to force push: ${e.message}`);
    }
}

async function getBranchDiff(repoPath: string, taskId: string, baseBranch: string): Promise<string> {
    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
    if (!fs.existsSync(worktreePath)) {
        throw new Error("Worktree does not exist");
    }
    const sanitizedBranch = sanitizeBranchName(baseBranch);
    // Get diff between base branch and current HEAD
    return await runGit(`git diff ${sanitizedBranch}...HEAD`, worktreePath, repoPath);
}

async function updatePR(repoPath: string, taskId: string, prData: { title?: string; body?: string }): Promise<{ success: boolean; message?: string }> {
    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
    if (!fs.existsSync(worktreePath)) {
        throw new Error("Worktree does not exist");
    }

    try {
        const titleArg = prData.title ? `--title ${JSON.stringify(prData.title)}` : '';
        const bodyArg = prData.body ? `--body ${JSON.stringify(prData.body)}` : '';
        await runGit(`gh pr edit ${titleArg} ${bodyArg}`, worktreePath, repoPath);
        return { success: true };
    } catch (e: any) {
        throw new Error(`Failed to update PR: ${e.message}`);
    }
}

async function getDefaultBranch(repoPath: string): Promise<string> {
    try {
        // Try the most efficient method first: query the symbolic ref directly
        // This doesn't list all branches and is much faster
        const output = await runGit('git symbolic-ref refs/remotes/origin/HEAD', repoPath, repoPath);
        // Output format is "refs/remotes/origin/main" - extract the branch name
        const match = output.match(/refs\/remotes\/origin\/(.+)/);
        if (match) {
            return match[1];
        }
    } catch (e) {
        // If symbolic-ref fails (not set), try setting it first then querying again
        try {
            await runGit('git remote set-head origin --auto', repoPath, repoPath);
            const output = await runGit('git symbolic-ref refs/remotes/origin/HEAD', repoPath, repoPath);
            const match = output.match(/refs\/remotes\/origin\/(.+)/);
            if (match) {
                return match[1];
            }
        } catch (e2) {
            // If that fails too, fall back to parsing git remote show output
            // Use increased maxBuffer to handle repos with many branches
            try {
                const output = await runGit('git remote show origin', repoPath, repoPath, { maxBuffer: 10 * 1024 * 1024 });
                const match = output.match(/HEAD branch: (.+)/);
                if (match) {
                    return match[1];
                }
            } catch (e3) {
                console.warn('[Git] Could not determine default branch, using "main" as fallback');
            }
        }
    }
    
    // Final fallback
    return 'main';
}

async function pullMainBranch(repoPath: string): Promise<{ success: boolean; message: string }> {
    if (!repoPath) throw new Error("Repository not selected");
    
    try {
        // Get the default branch name
        const defaultBranch = await getDefaultBranch(repoPath);
        
        // Fetch latest changes from origin
        await runGit('git fetch origin', repoPath, repoPath);
        
        // Get current branch to determine the pull strategy
        let currentBranch = '';
        try {
            currentBranch = await runGit('git rev-parse --abbrev-ref HEAD', repoPath, repoPath);
        } catch (e) {
            // If we can't determine current branch (e.g., detached HEAD),
            // use the safer fetch strategy
            console.warn('[Git] Could not determine current branch, using fetch strategy');
        }
        
        // If we're on the default branch, do a normal pull
        // Otherwise, just update the local branch ref
        if (currentBranch && currentBranch === defaultBranch) {
            await runGit(`git pull origin ${defaultBranch}`, repoPath, repoPath);
        } else {
            // Update the local branch reference to match the remote
            // This is safe even if the local branch doesn't exist yet
            await runGit(`git fetch origin ${defaultBranch}:${defaultBranch}`, repoPath, repoPath);
        }
        
        return { 
            success: true, 
            message: `Successfully pulled ${defaultBranch} branch` 
        };
    } catch (e: any) {
        console.error("Pull failed:", e);
        throw new Error(`Failed to pull: ${e.message}`);
    }
}

async function checkPRMergeStatus(repoPath: string, prUrl: string): Promise<boolean> {
    try {
        // Use gh CLI to check if the PR is merged
        const output = await runGit(`gh pr view ${JSON.stringify(prUrl)} --json state --jq .state`, repoPath, repoPath);
        return output.trim().toLowerCase() === 'merged';
    } catch (e: any) {
        console.error(`Failed to check PR merge status: ${e.message}`);
        return false;
    }
}

async function hasChangesForPR(repoPath: string, taskId: string, baseBranch: string): Promise<boolean> {
    const worktreePath = resolveTaskWorktreePath(repoPath, taskId);
    if (!fs.existsSync(worktreePath)) {
        return false;
    }

    try {
        // Check for uncommitted changes (both staged and unstaged)
        const status = await runGit('git status --porcelain', worktreePath, repoPath);
        if (status.trim()) {
            return true;
        }

        const sanitizedBranch = sanitizeBranchName(baseBranch);
        // Check for commits ahead of base branch
        const commitsAhead = await runGit(`git rev-list ${sanitizedBranch}..HEAD --count`, worktreePath, repoPath);
        if (parseInt(commitsAhead.trim(), 10) > 0) {
            return true;
        }

        return false;
    } catch (e: any) {
        console.error(`Failed to check for changes in task ${taskId} at ${repoPath}: ${e.message}`);
        return false;
    }
}

export { createWorktree, runGit, removeWorktree, rebase, createPR, pushBranch, pushBranchForce, getBranchDiff, updatePR, getDefaultBranch, pullMainBranch, checkPRMergeStatus, hasChangesForPR };
