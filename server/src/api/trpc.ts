import { initTRPC } from '@trpc/server';
import { AppConfig } from '../types';

export interface Context {
    getState: () => AppConfig;
    createWorktree?: (repoPath: string, taskId: string, branchName: string, copyFiles?: string, worktreePath?: string) => Promise<any>;
    ensureTerminalForTask?: (taskId: string, repoPath: string) => Promise<void>;
    runAiForTask?: (taskId: string, repoPath: string, aiToolOverride?: string) => Promise<void>;
    removeWorktree?: (repoPath: string, taskId: string, branchName?: string, worktreePath?: string) => Promise<any>;
    shutdownTerminalForTask?: (taskId: string) => Promise<void>;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
