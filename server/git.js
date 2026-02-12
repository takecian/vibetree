const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execAsync = util.promisify(exec);

function setupGitRoutes(app, getState) {

    // Helper to run git commands
    async function runGit(command, cwd) {
        const { repoPath } = getState();
        const workingDir = cwd || repoPath;

        if (!workingDir) throw new Error("Repository path not set");

        try {
            const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
            return stdout.trim();
        } catch (error) {
            console.error(`Git error: ${command}`, error);
            throw error;
        }
    }

    app.get('/api/git/status', async (req, res) => {
        try {
            const branch = await runGit('git branch --show-current');
            const status = await runGit('git status --short');
            res.json({ branch, status });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/git/worktree', async (req, res) => {
        const { branchName, taskId } = req.body;
        const { repoPath } = getState();

        if (!repoPath) return res.status(400).json({ error: 'Repository not selected' });
        if (!branchName || !taskId) return res.status(400).json({ error: 'Missing branchName or taskId' });

        try {
            const worktreePath = path.join(repoPath, '.vibe-flow', 'worktrees', taskId);

            if (fs.existsSync(worktreePath)) {
                return res.json({ success: true, path: worktreePath, message: 'Worktree already exists' });
            }

            let createBranchFlag = '';
            try {
                await runGit(`git rev-parse --verify ${branchName}`);
            } catch (e) {
                createBranchFlag = `-b ${branchName}`;
            }

            await runGit(`git worktree add ${createBranchFlag} "${worktreePath}"`);

            res.json({ success: true, path: worktreePath });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/git/diff', async (req, res) => {
        const { taskId } = req.query;
        const { repoPath } = getState();
        if (!repoPath) return res.status(400).json({ error: 'Repository not selected' });

        const cwd = taskId ? path.join(repoPath, '.vibe-flow', 'worktrees', taskId) : repoPath;

        try {
            const diff = await runGit('git diff', cwd);
            res.json({ diff });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/git/commit', async (req, res) => {
        const { taskId, message } = req.body;
        const { repoPath } = getState();
        if (!repoPath) return res.status(400).json({ error: 'Repository not selected' });

        const cwd = taskId ? path.join(repoPath, '.vibe-flow', 'worktrees', taskId) : repoPath;

        try {
            await runGit('git add .', cwd);
            await runGit(`git commit -m "${message}"`, cwd);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
}

module.exports = { setupGitRoutes };
