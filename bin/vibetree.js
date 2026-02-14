#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
// const open = require('open'); // Moved to dynamic import

const argv = yargs(hideBin(process.argv)).argv;

async function verifyNativeModules(pkgRoot) {
    try {
        require(require.resolve('node-pty', { paths: [path.join(pkgRoot, 'node_modules'), pkgRoot] }));
        require(require.resolve('better-sqlite3', { paths: [path.join(pkgRoot, 'node_modules'), pkgRoot] }));
    } catch (e) {
        if (e.code === 'ERR_DLOPEN_FAILED' || (e.message && e.message.includes('Node.js version'))) {
            console.log('\x1b[33m%s\x1b[0m', 'Binary mismatch detected. Rebuilding native modules for your Node.js version...');
            spawnSync('npm', ['rebuild', 'node-pty', 'better-sqlite3'], { cwd: pkgRoot, stdio: 'inherit', shell: true });
        }
    }
}

(async () => {
    const pkgRoot = path.join(__dirname, '..');

    // Verify native modules before proceeding
    await verifyNativeModules(pkgRoot);

    const PORT = process.env.VIBETREE_PORT || 5179;
    const repoPath = process.cwd();

    console.log(`Starting VibeTree...`);
    console.log(`Port: ${PORT}`);

    // 3. Start Server
    const serverPath = path.join(pkgRoot, 'server', 'dist', 'index.js');
    const clientPath = path.join(pkgRoot, 'client', 'dist');
    const env = {
        ...process.env,
        REPO_PATH: repoPath,
        VIBETREE_PORT: PORT,
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
    setTimeout(() => {
        console.log(`Opening dashboard at http://localhost:${PORT}...`);
        open(`http://localhost:${PORT}`);
    }, 2000);

})();
