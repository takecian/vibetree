import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getTaskById } from './tasks';
import { initDB } from './db';
import { Task } from './types';

describe('tasks', () => {
  let testRepoPath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testRepoPath = path.join(os.tmpdir(), `vibetree-tasks-test-${Date.now()}`);
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Initialize database
    await initDB(testRepoPath);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('getTaskById', () => {
    it('should return undefined when task does not exist', async () => {
      const task = await getTaskById('non-existent-id');
      
      expect(task).toBeUndefined();
    });

    it('should return task when it exists', async () => {
      const db = (await import('./db')).getDB();
      await db.read();

      const testTask: Task = {
        id: 'task-123',
        title: 'Test Task',
        description: 'Test Description',
        createdAt: '2024-01-01T00:00:00.000Z',
        branchName: 'feature/test',
      };

      db.data.tasks.push(testTask);
      await db.write();

      const task = await getTaskById('task-123');
      
      expect(task).toBeDefined();
      expect(task?.id).toBe('task-123');
      expect(task?.title).toBe('Test Task');
      expect(task?.description).toBe('Test Description');
    });

    it('should return the correct task when multiple tasks exist', async () => {
      const db = (await import('./db')).getDB();
      await db.read();

      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'First Task',
          description: 'First Description',
          createdAt: '2024-01-01T00:00:00.000Z',
          branchName: 'feature/first',
        },
        {
          id: 'task-2',
          title: 'Second Task',
          description: 'Second Description',
          createdAt: '2024-01-02T00:00:00.000Z',
          branchName: 'feature/second',
        },
        {
          id: 'task-3',
          title: 'Third Task',
          description: 'Third Description',
          createdAt: '2024-01-03T00:00:00.000Z',
          branchName: 'feature/third',
        },
      ];

      db.data.tasks = tasks;
      await db.write();

      const task = await getTaskById('task-2');
      
      expect(task?.id).toBe('task-2');
      expect(task?.title).toBe('Second Task');
    });

    it('should handle empty database', async () => {
      const task = await getTaskById('any-id');
      
      expect(task).toBeUndefined();
    });

    it('should refresh data from disk', async () => {
      const db = (await import('./db')).getDB();
      await db.read();

      const testTask: Task = {
        id: 'task-refresh',
        title: 'Refresh Test',
        description: 'Test Description',
        createdAt: '2024-01-01T00:00:00.000Z',
        branchName: 'feature/refresh',
      };

      db.data.tasks.push(testTask);
      await db.write();

      // Call getTaskById which should read from disk
      const task = await getTaskById('task-refresh');
      
      expect(task).toBeDefined();
      expect(task?.id).toBe('task-refresh');
    });
  });
});
