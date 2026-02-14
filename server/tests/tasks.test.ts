import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getTaskById } from '../src/services/tasks';
import { addRepository, createTask as createTaskInDB, clearDB } from '../src/services/db';

describe('tasks', () => {
  const testRepoPath = '/test/repo';
  let repositoryId: string;

  beforeEach(async () => {
    clearDB();
    const repo = addRepository(testRepoPath);
    repositoryId = repo.id;
  });

  afterEach(() => {
    clearDB();
  });

  describe('getTaskById', () => {
    it('should return undefined when task does not exist', async () => {
      const task = await getTaskById('non-existent-id', testRepoPath);
      expect(task).toBeUndefined();
    });

    it('should return task when it exists', async () => {
      const testTask = createTaskInDB(repositoryId, {
        id: 'task-123',
        title: 'Test Task',
        description: 'Test Description',
        createdAt: '2024-01-01T00:00:00.000Z',
        branchName: 'feature/test',
      });

      const task = await getTaskById('task-123', testRepoPath);

      expect(task).toBeDefined();
      expect(task?.id).toBe('task-123');
      expect(task?.title).toBe('Test Task');
      expect(task?.description).toBe('Test Description');
    });

    it('should return the correct task when multiple tasks exist', async () => {
      createTaskInDB(repositoryId, { id: 'task-1', title: 'First Task' });
      createTaskInDB(repositoryId, { id: 'task-2', title: 'Second Task' });
      createTaskInDB(repositoryId, { id: 'task-3', title: 'Third Task' });

      const task = await getTaskById('task-2', testRepoPath);

      expect(task?.id).toBe('task-2');
      expect(task?.title).toBe('Second Task');
    });

    it('should handle empty database', async () => {
      const task = await getTaskById('any-id', testRepoPath);
      expect(task).toBeUndefined();
    });
  });
});
