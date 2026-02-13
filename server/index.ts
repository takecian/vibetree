import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { setupTerminal } from './terminal';
import { setupGitRoutes, createWorktree } from './git';
import { setupTaskRoutes, getTaskById } from './tasks';
import { setupSystemRoutes } from './system';
import { initDB } from './db';
import fs from 'fs';
import { AppConfig } from './types';

// Extend the Express Request type to include appState
declare global {
    namespace Express {
        interface Request {
            appState: AppConfig;
        }
    }
}

// Initial State
let STATE: AppConfig = {
    repoPath: process.env.REPO_PATH || '',
    aiTool: process.env.AI_TOOL || 'claude',
    copyFiles: ''
};

const app: Application = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware to inject current state
app.use((req: Request, res: Response, next: NextFunction) => {
    req.appState = STATE;
    next();
});

// Config Routes
app.get('/api/config', (req: Request, res: Response) => {
    res.json(STATE);
});

app.post('/api/config', async (req: Request, res: Response) => {
    const { repoPath, aiTool, copyFiles } = req.body;

    if (repoPath !== undefined) {
        if (repoPath && !fs.existsSync(repoPath)) {
            return res.status(400).json({ error: 'Path does not exist' });
        }
        STATE.repoPath = repoPath || '';
        if (repoPath) await initDB(repoPath);
    }

    if (aiTool !== undefined) {
        STATE.aiTool = aiTool;
    }

    if (copyFiles !== undefined) {
        STATE.copyFiles = typeof copyFiles === 'string' ? copyFiles : '';
    }

    res.json(STATE);
});

// Initialize modules
if (STATE.repoPath) {
    initDB(STATE.repoPath).catch(err => console.error("Failed to init DB:", err));
}

// Setup Routes
setupTerminal(io, () => STATE, getTaskById);
setupGitRoutes(app, () => STATE);
setupTaskRoutes(app, () => STATE, (repoPath, taskId, branchName) =>
    createWorktree(repoPath, taskId, branchName, STATE.copyFiles)
);
setupSystemRoutes(app);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', ...STATE });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
});
