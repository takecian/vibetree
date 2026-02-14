import { getTaskById as getTaskByIdFromDB } from './db';
import { Task } from './types';

async function getTaskById(taskId: string, _repoPath: string): Promise<Task | undefined> {
    return getTaskByIdFromDB(taskId);
}

export { getTaskById };
