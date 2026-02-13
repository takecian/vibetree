#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const prompts = require('prompts');
// const open = require('open'); // Moved to dynamic import

const argv = yargs(hideBin(process.argv))
    .option('repo', {
        alias: 'r',
        type: 'string',
        description: 'Path to target repository',
    })
    .option('ai', {
        alias: 'a',
        type: 'string',
        choices: ['claude', 'codex', 'gemini'],
        description: 'AI tool to use',
    })
    .argv;

(async () => {
    // 1. Resolve Repo Path
    let repoPath = argv.repo ? path.resolve(argv.repo) : process.cwd();

    if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
        console.error(`Error: Repository path does not exist: ${repoPath}`);
        process.exit(1);
    }

    // 2. Resolve AI Tool
    const configPath = path.join(repoPath, '.vibe-flow', 'config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) { }
    }

    let aiTool = argv.ai || config.aiTool;

    if (!aiTool) {
        const response = await prompts({
            type: 'select',
            name: 'aiTool',
            message: 'Select AI tool to use:',
            choices: [
                { title: 'Claude', value: 'claude' },
                { title: 'Codex (OpenAI)', value: 'codex' },
                { title: 'Gemini', value: 'gemini' },
            ],
        });
        aiTool = response.aiTool;

        // Save preference
        const vibeDir = path.join(repoPath, '.vibe-flow');
        if (!fs.existsSync(vibeDir)) fs.mkdirSync(vibeDir, { recursive: true });
        fs.writeFileSync(path.join(vibeDir, 'config.json'), JSON.stringify({ aiTool }, null, 2));
    }

    console.log(`Starting Vibe-Flow...`);
    console.log(`Repository: ${repoPath}`);
    console.log(`AI Tool: ${aiTool}`);

    // 3. Start Server
    const pkgRoot = path.join(__dirname, '..');
    const serverPath = path.join(pkgRoot, 'server', 'dist', 'index.js');
    const clientPath = path.join(pkgRoot, 'client', 'dist');
    const env = {
        ...process.env,
        REPO_PATH: repoPath,
        AI_TOOL: aiTool,
        VIBE_FLOW_PORT: process.env.VIBE_FLOW_PORT || 3000,
    };

    if (!fs.existsSync(serverPath)) {
        console.log('Building server (first run or npx)...');
        const build = spawnSync('npm', ['run', 'build', '-w', 'server'], {
            cwd: pkgRoot,
            stdio: 'inherit',
            shell: true,
        });
        if (build.status !== 0) {
            console.error('Server build failed.');
            process.exit(build.status || 1);
        }
    }

    if (!fs.existsSync(clientPath)) {
        console.log('Building client dashboard (first run or npx)...');
        const build = spawnSync('npm', ['run', 'build', '-w', 'client'], {
            cwd: pkgRoot,
            stdio: 'inherit',
            shell: true,
        });
        if (build.status !== 0) {
            console.error('Client build failed.');
            process.exit(build.status || 1);
        }
    }

    console.log('Launching server...');
    const serverProcess = spawn('node', [serverPath], { env, stdio: 'inherit', cwd: pkgRoot });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });

    // Open Browser
    const { default: open } = await import('open');
    const port = process.env.VIBE_FLOW_PORT || 3000;
    setTimeout(() => {
        console.log(`Opening dashboard at http://localhost:${port}...`);
        open(`http://localhost:${port}`);
    }, 2000);

})();
