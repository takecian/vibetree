#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const prompts = require('prompts');
const open = require('open');

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

    // 3. Start Server (and Client)
    // For production/npx, we might need to serve client built statics from server
    // For now in dev, we'll assume we want to run the dev servers or a production build
    // This script assumes it's running from the installed package context

    const serverPath = path.join(__dirname, '../server/index.js'); // Entry point for server
    // We need to pass env vars
    const env = {
        ...process.env,
        REPO_PATH: repoPath,
        AI_TOOL: aiTool,
        VIBE_FLOW_PORT: process.env.VIBE_FLOW_PORT || 3000,
    };

    // Check if server exists (it might be in node_modules if installed via npm)
    // If we are developing, we might run `npm run dev`
    // But for the `bin` executable, it should launch the server process.

    // Actually, let's run the server. Logic for server to serve client:
    // Server should use `express.static` to serve `client/dist`.
    // So we probably need to build client first or assume it's built?
    // For this tasks's purpose ("running locally", "npx"), we should ideally build client on install or have it pre-built.
    // Since we are in development, `npm start` runs `bin/vibe-flow.js`. 
    // Let's make this script launch the dev servers for now using concurrently, 
    // OR launch the actual server if we are in "production".

    // Simplified for this task: Launch server script.
    // We need to implement server/index.js first.

    console.log('Launching server...');
    // We'll spawn the server process. 
    // Note: This expects `server` dependencies to be installed.

    const serverProcess = spawn('node', [serverPath], { env, stdio: 'inherit' });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });

    // Open Browser
    // setTimeout(() => open('http://localhost:3000'), 2000);

})();
