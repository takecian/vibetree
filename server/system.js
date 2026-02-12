const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const os = require('os');
const path = require('path');
const fs = require('fs');

function setupSystemRoutes(app) {

    app.get('/api/system/pick-folder', async (req, res) => {
        try {
            let command;
            if (os.platform() === 'darwin') {
                // macOS
                command = `osascript -e 'POSIX path of (choose folder with prompt "Select a Git Repository")'`;
            } else if (os.platform() === 'win32') {
                // Windows (PowerShell)
                command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowDialog() | Out-Null; $f.SelectedPath"`;
            } else {
                throw new Error('Directory picker not supported on this platform yet. Please paste the path.');
            }

            if (command) {
                const { stdout } = await execAsync(command);
                const path = stdout.trim();
                if (path) {
                    res.json({ path });
                } else {
                    res.json({ canceled: true });
                }
            }
        } catch (e) {
            console.error('Pick folder error:', e);
            if (e.message.includes('User canceled')) {
                return res.json({ canceled: true });
            }
            res.status(500).json({ error: e.message });
        }
    });

    app.get('/api/system/ai-tools', async (req, res) => {
        const tools = ['claude', 'codex', 'gemini'];
        const results = {};

        // Expand PATH to include common locations
        const commonPaths = [
            '/opt/homebrew/bin',
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            process.env.HOME + '/.local/bin',
            process.env.HOME + '/bin',
        ];
        const envPath = process.env.PATH || '';
        const extendedPath = commonPaths.join(path.delimiter) + path.delimiter + envPath;

        console.log('Checking AI tools with PATH:', extendedPath);

        for (const tool of tools) {
            let found = false;

            // 1. Check executable in PATH
            try {
                const cmd = os.platform() === 'win32' ? `where ${tool}` : `which ${tool}`;
                const { stdout } = await execAsync(cmd, {
                    env: { ...process.env, PATH: extendedPath }
                });
                if (stdout.trim()) {
                    console.log(`Tool ${tool} found at: ${stdout.trim()}`);
                    found = true;
                }
            } catch (e) {
                // Ignore error, try next method
            }

            // 2. Check for configuration directory/files (fallback like vibe-kanban)
            if (!found) {
                try {
                    const home = os.homedir();
                    let configPath;
                    if (tool === 'gemini') {
                        configPath = path.join(home, '.gemini');
                    } else if (tool === 'claude') {
                        configPath = path.join(home, '.anthropic');
                    }

                    if (configPath && fs.existsSync(configPath)) {
                        console.log(`Tool ${tool} config config directory found at: ${configPath}`);
                        found = true;
                    }
                } catch (e) {
                    console.log(`Config check failed for ${tool}:`, e);
                }
            }

            results[tool] = found;
        }
        res.json(results);
    });

}

module.exports = { setupSystemRoutes };
