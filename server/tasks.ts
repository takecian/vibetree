import { getDB } from './db';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, Application, NextFunction } from 'express';
import { Task, DBData, AppConfig } from './types';
import { Low } from 'lowdb';

type CreateWorktreeFunction = (repoPath: string, taskId: string, branchName: string) => Promise<{ success: boolean; path: string; message?: string }>;
type EnsureTerminalForTaskFunction = (taskId: string) => Promise<void>;
type RunAiForTaskFunction = (taskId: string) => Promise<void>;


async function getTaskById(taskId: string, repoPath: string): Promise<Task | undefined> {
    const db: Low<DBData> = getDB(repoPath);
    await db.read();
    return db.data.tasks.find((t: Task) => t.id === taskId);
}


export { getTaskById };
