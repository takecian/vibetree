import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { setupTerminal } from './terminal';
import { createWorktree } from './git';
import { getTaskById } from './tasks';
import { initDB } from './db';
import fs from 'fs';
import { AppConfig } from './types';
import { loadConfig, saveConfig } from './config';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { Context } from './trpc';

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
const { ensureTerminalForTask, runAiForTask } = setupTerminal(io, () => STATE, getTaskById);

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
            createWorktree: (repoPath, taskId, branchName) => createWorktree(repoPath, taskId, branchName, STATE.copyFiles),
            ensureTerminalForTask,
            runAiForTask,
        }),
    })
);

// Initialize modules
if (STATE.repoPath) {
    initDB(STATE.repoPath).catch(err => console.error("Failed to init DB:", err));
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

const PORT = process.env.VIBE_FLOW_PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
});
