import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { appRouter } from './router';
import { initDB } from './db';
import { Task, AppConfig } from './types';

const execAsync = util.promisify(exec);

describe('router', () => {
  let testRepoPath: string;
  let mockState: AppConfig;
  let mockCreateWorktree: ReturnType<typeof vi.fn>;
  let mockEnsureTerminalForTask: ReturnType<typeof vi.fn>;
  let mockRunAiForTask: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testRepoPath = path.join(os.tmpdir(), `vibetree-router-test-${Date.now()}`);
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Initialize database
    await initDB(testRepoPath);

    // Setup mock state and functions
    mockState = {
      repoPath: testRepoPath,
      aiTool: 'claude',
      copyFiles: '',
    };

    mockCreateWorktree = vi.fn().mockResolvedValue({
      success: true,
      path: path.join(testRepoPath, '.vibetree', 'worktrees', 'test-task'),
    });

    mockEnsureTerminalForTask = vi.fn().mockResolvedValue(undefined);
    mockRunAiForTask = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  const createContext = () => ({
    getState: () => mockState,
    createWorktree: mockCreateWorktree,
    ensureTerminalForTask: mockEnsureTerminalForTask,
    runAiForTask: mockRunAiForTask,
  });

  describe('Config Procedures', () => {
    describe('getConfig', () => {
      it('should return current state', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getConfig();

        expect(result).toEqual(mockState);
      });
    });

    describe('updateConfig', () => {
      it('should update repoPath', async () => {
        // Create a temporary directory to use as the new path
        const newPath = path.join(os.tmpdir(), `vibetree-new-path-${Date.now()}`);
        fs.mkdirSync(newPath, { recursive: true });

        const caller = appRouter.createCaller(createContext());
        
        const result = await caller.updateConfig({
          repoPath: newPath,
        });

        expect(result.repoPath).toBe(newPath);

        // Clean up
        fs.rmSync(newPath, { recursive: true, force: true });
      });

      it('should update aiTool', async () => {
        const caller = appRouter.createCaller(createContext());
        
        const result = await caller.updateConfig({
          aiTool: 'codex',
        });

        expect(result.aiTool).toBe('codex');
      });

      it('should update copyFiles', async () => {
        const caller = appRouter.createCaller(createContext());
        
        const result = await caller.updateConfig({
          copyFiles: '.env\nconfig.json',
        });

        expect(result.copyFiles).toBe('.env\nconfig.json');
      });

      it('should throw error if repoPath does not exist', async () => {
        const caller = appRouter.createCaller(createContext());
        
        await expect(
          caller.updateConfig({ repoPath: '/nonexistent/path' })
        ).rejects.toThrow('Path does not exist');
      });

      it('should allow empty repoPath', async () => {
        const caller = appRouter.createCaller(createContext());
        
        const result = await caller.updateConfig({
          repoPath: '',
        });

        expect(result.repoPath).toBe('');
      });
    });
  });

  describe('Task Procedures', () => {
    describe('getTasks', () => {
      it('should return empty array when no tasks exist', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getTasks();

        expect(result).toEqual([]);
      });

      it('should return all tasks', async () => {
        const db = (await import('./db')).getDB();
        await db.read();

        const testTasks: Task[] = [
          {
            id: 'task-1',
            title: 'Task 1',
            description: 'Description 1',
            createdAt: '2024-01-01',
            branchName: 'feature/task-1',
          },
          {
            id: 'task-2',
            title: 'Task 2',
            description: 'Description 2',
            createdAt: '2024-01-02',
            branchName: 'feature/task-2',
          },
        ];

        db.data.tasks = testTasks;
        await db.write();

        const caller = appRouter.createCaller(createContext());
        const result = await caller.getTasks();

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('task-1');
        expect(result[1].id).toBe('task-2');
      });
    });

    describe('createTask', () => {
      it('should create a new task with title', async () => {
        const caller = appRouter.createCaller(createContext());
        
        const result = await caller.createTask({
          title: 'New Task',
        });

        expect(result.id).toBeDefined();
        expect(result.title).toBe('New Task');
        expect(result.description).toBe('');
        expect(result.createdAt).toBeDefined();
        expect(result.branchName).toMatch(/^feature\/task-/);
      });

      it('should create a task with description', async () => {
        const caller = appRouter.createCaller(createContext());
        
        const result = await caller.createTask({
          title: 'New Task',
          description: 'Task description',
        });

        expect(result.description).toBe('Task description');
      });

      it('should call createWorktree when repoPath is set', async () => {
        const caller = appRouter.createCaller(createContext());
        
        await caller.createTask({
          title: 'New Task',
        });

        expect(mockCreateWorktree).toHaveBeenCalled();
      });

      it('should call ensureTerminalForTask when repoPath is set', async () => {
        const caller = appRouter.createCaller(createContext());
        
        await caller.createTask({
          title: 'New Task',
        });

        expect(mockEnsureTerminalForTask).toHaveBeenCalled();
      });

      it('should call runAiForTask when repoPath is set', async () => {
        const caller = appRouter.createCaller(createContext());
        
        // Add a small delay to allow async call to complete
        await caller.createTask({
          title: 'New Task',
        });

        expect(mockRunAiForTask).toHaveBeenCalled();
      });

      it('should persist task to database', async () => {
        const caller = appRouter.createCaller(createContext());
        
        await caller.createTask({
          title: 'Persisted Task',
        });

        const db = (await import('./db')).getDB();
        await db.read();

        expect(db.data.tasks).toHaveLength(1);
        expect(db.data.tasks[0].title).toBe('Persisted Task');
      });
    });

    describe('updateTask', () => {
      it('should update task title', async () => {
        const db = (await import('./db')).getDB();
        await db.read();

        const testTask: Task = {
          id: 'task-update-1',
          title: 'Original Title',
          description: 'Description',
          createdAt: '2024-01-01',
          branchName: 'feature/test',
        };

        db.data.tasks.push(testTask);
        await db.write();

        const caller = appRouter.createCaller(createContext());
        const result = await caller.updateTask({
          id: 'task-update-1',
          updates: { title: 'Updated Title' },
        });

        expect(result.title).toBe('Updated Title');
        expect(result.description).toBe('Description');
      });

      it('should update task description', async () => {
        const db = (await import('./db')).getDB();
        await db.read();

        const testTask: Task = {
          id: 'task-update-2',
          title: 'Title',
          description: 'Original Description',
          createdAt: '2024-01-01',
          branchName: 'feature/test',
        };

        db.data.tasks.push(testTask);
        await db.write();

        const caller = appRouter.createCaller(createContext());
        const result = await caller.updateTask({
          id: 'task-update-2',
          updates: { description: 'Updated Description' },
        });

        expect(result.description).toBe('Updated Description');
      });

      it('should throw error when task does not exist', async () => {
        const caller = appRouter.createCaller(createContext());
        
        await expect(
          caller.updateTask({
            id: 'non-existent',
            updates: { title: 'New Title' },
          })
        ).rejects.toThrow('Task not found');
      });
    });

    describe('deleteTask', () => {
      it('should delete task by id', async () => {
        const db = (await import('./db')).getDB();
        await db.read();

        const testTask: Task = {
          id: 'task-delete-1',
          title: 'Task to Delete',
          description: 'Description',
          createdAt: '2024-01-01',
          branchName: 'feature/test',
        };

        db.data.tasks.push(testTask);
        await db.write();

        const caller = appRouter.createCaller(createContext());
        const result = await caller.deleteTask('task-delete-1');

        expect(result.success).toBe(true);

        await db.read();
        expect(db.data.tasks).toHaveLength(0);
      });

      it('should not throw error when deleting non-existent task', async () => {
        const caller = appRouter.createCaller(createContext());
        
        const result = await caller.deleteTask('non-existent');
        
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Git Procedures', () => {
    beforeEach(async () => {
      // Initialize git repo in test directory
      await execAsync('git init', { cwd: testRepoPath });
      await execAsync('git config user.email "test@example.com"', { cwd: testRepoPath });
      await execAsync('git config user.name "Test User"', { cwd: testRepoPath });
      
      // Create initial commit
      const testFile = path.join(testRepoPath, 'test.txt');
      fs.writeFileSync(testFile, 'content');
      await execAsync('git add .', { cwd: testRepoPath });
      await execAsync('git commit -m "Initial"', { cwd: testRepoPath });
    });

    describe('getGitStatus', () => {
      it('should return git status for main repo', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getGitStatus({});

        expect(result.branch).toBeDefined();
        expect(result.status).toBeDefined();
      });

      it('should return empty status when no changes', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getGitStatus({});

        expect(result.status).toBe('');
      });
    });

    describe('getGitDiff', () => {
      it('should return git diff', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getGitDiff({});

        expect(result).toHaveProperty('diff');
      });

      it('should return empty diff when no changes', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getGitDiff({});

        expect(result.diff).toBe('');
      });
    });

    describe('createCommit', () => {
      it('should create a commit', async () => {
        // Add a change
        fs.writeFileSync(path.join(testRepoPath, 'new.txt'), 'new content');

        const caller = appRouter.createCaller(createContext());
        const result = await caller.createCommit({
          message: 'Test commit',
        });

        expect(result.success).toBe(true);

        // Verify commit was created
        const { stdout } = await execAsync('git log -1 --pretty=%B', { cwd: testRepoPath });
        expect(stdout.trim()).toBe('Test commit');
      });
    });
  });

  describe('System Procedures', () => {
    describe('getAiTools', () => {
      it('should return status of AI tools', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getAiTools();

        expect(result).toHaveProperty('claude');
        expect(result).toHaveProperty('codex');
        expect(result).toHaveProperty('gemini');
        expect(typeof result.claude).toBe('boolean');
        expect(typeof result.codex).toBe('boolean');
        expect(typeof result.gemini).toBe('boolean');
      });
    });
  });
});
