import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { setupTerminal } from './services/terminal';
import { createWorktree } from './services/git';
import { getTaskById } from './services/tasks';
import { initDB } from './services/db';
import fs from 'fs';
import { AppConfig } from './types';
import { loadConfig, saveConfig } from './config';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './api/router';
import { Context } from './api/trpc';

// Extend the Express Request type to include appState
declare global {
    namespace Express {
        interface Request {
            appState: AppConfig;
        }
    }
}

// Initial State loaded from persistent config
let STATE: AppConfig = loadConfig();

const app: Application = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Setup helpers and routes
const { ensureTerminalForTask, runAiForTask, shutdownTerminalForTask } = setupTerminal(io, () => STATE, getTaskById);

// Middleware to inject current state
app.use((req: Request, res: Response, next: NextFunction) => {
    req.appState = STATE;
    next();
});

// tRPC Middleware
app.use(
    '/api/trpc',
    trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext: (): Context => ({
            getState: () => STATE,
            createWorktree: (repoPath, taskId, branchName, copyFiles, worktreePath) => createWorktree(repoPath, taskId, branchName, copyFiles || STATE.copyFiles, worktreePath),
            ensureTerminalForTask: (taskId, repoPath) => ensureTerminalForTask(taskId, repoPath),
            runAiForTask: (taskId, repoPath) => runAiForTask(taskId, repoPath),
            removeWorktree: (repoPath, taskId, branchName, worktreePath) => import('./services/git').then(m => m.removeWorktree(repoPath, taskId, branchName, worktreePath)),
            shutdownTerminalForTask,
        }),
    })
);

// Initialize modules
import { getRepositories, getTasks } from './services/db';

const repos = getRepositories();
for (const repo of repos) {
    if (repo.path) {
        console.log(`[Server] Restoring terminals for repository: ${repo.path}`);
        getTasks(repo.id).forEach(async (task) => {
            await ensureTerminalForTask(task.id, repo.path);
        });
    }
}

// Setup legacy REST Routes (Disabled - using tRPC instead)
/*
setupGitRoutes(app, () => STATE);
setupTaskRoutes(app, () => STATE, (repoPath, taskId, branchName) =>
    createWorktree(repoPath, taskId, branchName, STATE.copyFiles),
    ensureTerminalForTask,
    runAiForTask
);
setupSystemRoutes(app);
*/

// Serve static files from the client/dist directory
const clientPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientPath));

// Health check
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', ...STATE });
});

// Catch-all route to serve index.html for client-side routing
// Using middleware instead of app.get('*') to avoid Express 5 / path-to-regexp v8 issues
app.use((req: Request, res: Response) => {
    const indexPath = path.join(clientPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Dashboard not found. Please build the client.');
    }
});

const PORT = process.env.VIBETREE_PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
});
