const pty = require('node-pty');
const os = require('os');
const path = require('path');
const fs = require('fs');

function setupTerminal(io, getState) {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'zsh';
    const sessions = {};

    io.on('connection', (socket) => {
        socket.on('terminal:create', ({ cols, rows, taskId }) => {
            const { repoPath } = getState();

            if (!repoPath) {
                socket.emit('terminal:error', 'Repository path not configured');
                return;
            }

            const termId = taskId || 'default';

            if (sessions[termId]) {
                sessions[termId].kill();
            }

            let workingDir = repoPath;
            if (taskId && taskId !== 'default') {
                const worktreePath = path.join(repoPath, '.vibe-flow', 'worktrees', taskId);
                if (fs.existsSync(worktreePath)) {
                    workingDir = worktreePath;
                }
            }

            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-color',
                cols: cols || 80,
                rows: rows || 30,
                cwd: workingDir,
                env: process.env
            });

            sessions[termId] = ptyProcess;

            ptyProcess.onData((data) => {
                socket.emit(`terminal:data:${termId}`, data);
            });

            socket.on(`terminal:input:${termId}`, (data) => {
                ptyProcess.write(data);
            });

            socket.on(`terminal:resize:${termId}`, ({ cols, rows }) => {
                ptyProcess.resize(cols, rows);
            });

            socket.on('disconnect', () => {
                // Cleanup if necessary
            });
        });
    });
}

module.exports = { setupTerminal };
