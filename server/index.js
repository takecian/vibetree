const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { setupTerminal } = require('./terminal');
const { setupGitRoutes, createWorktree } = require('./git');
const { setupTaskRoutes } = require('./tasks');
const { setupSystemRoutes } = require('./system');
const { initDB } = require('./db');
const fs = require('fs');

// Initial State
let STATE = {
    repoPath: process.env.REPO_PATH || '', // Start empty if not provided, or default
    aiTool: process.env.AI_TOOL || 'claude'
};

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware to inject current state
app.use((req, res, next) => {
    req.appState = STATE;
    next();
});

// Config Routes
app.get('/api/config', (req, res) => {
    res.json(STATE);
});

app.post('/api/config', async (req, res) => {
    const { repoPath, aiTool } = req.body;

    if (repoPath) {
        if (!fs.existsSync(repoPath)) {
            return res.status(400).json({ error: 'Path does not exist' });
        }
        STATE.repoPath = repoPath;
        await initDB(repoPath); // Re-init DB
    }

    if (aiTool) {
        STATE.aiTool = aiTool;
    }

    res.json(STATE);
});

// Initialize modules
// We pass a getter function or the STATE object reference where possible
// For DB, we just init it initially if we have a path
if (STATE.repoPath) {
    initDB(STATE.repoPath).catch(err => console.error("Failed to init DB:", err));
}

// Setup Routes
// specific modules now need to handle dynamic path.
// We'll modify them to take `() => STATE.repoPath` or similar.

setupTerminal(io, () => STATE);
setupGitRoutes(app, () => STATE);
setupTaskRoutes(app, () => STATE, createWorktree);
setupSystemRoutes(app);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', ...STATE });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
});
