import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { appRouter } from './router';
import { addRepository, getTasks, createTask, getTaskById, clearDB, normalizePath } from './db';
import { Repository, Task, AppConfig } from './types';
import { Context } from './trpc';

const execAsync = util.promisify(exec);

describe('router', () => {
  let testRepoPath: string;
  let testRepo: Repository;
  let mockState: AppConfig;
  let mockCreateWorktree: Mock;
  let mockEnsureTerminalForTask: Mock;
  let mockRunAiForTask: Mock;

  beforeEach(async () => {
    clearDB();

    // Create a temporary directory for testing
    testRepoPath = path.join(os.tmpdir(), `vibetree-router-test-${Date.now()}`);
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Initialize repository in DB
    testRepo = addRepository(testRepoPath);

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
    clearDB();
    vi.clearAllMocks();
  });

  const createContext = (): Context => ({
    getState: () => mockState,
    createWorktree: mockCreateWorktree as any,
    ensureTerminalForTask: mockEnsureTerminalForTask as any,
    runAiForTask: mockRunAiForTask as any,
    shutdownTerminalForTask: vi.fn().mockResolvedValue(undefined) as any,
    removeWorktree: vi.fn().mockResolvedValue(undefined) as any,
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
      it('should update repoPath and add to repositories', async () => {
        // Create a temporary directory to use as the new path
        const newPath = path.join(os.tmpdir(), `vibetree-new-path-${Date.now()}`);
        fs.mkdirSync(newPath, { recursive: true });

        const caller = appRouter.createCaller(createContext());

        const result = await caller.updateConfig({
          repoPath: newPath,
        });

        expect(result.repoPath).toBe(normalizePath(newPath));

        // Verify it was added to repositories
        const repos = await caller.getRepositories();
        expect(repos.map(r => r.path)).toContain(normalizePath(newPath));

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
    });
  });

  describe('Task Procedures', () => {
    describe('getTasks', () => {
      it('should return empty array when no tasks exist', async () => {
        const caller = appRouter.createCaller(createContext());
        const result = await caller.getTasks({ repoPath: testRepoPath });

        expect(result).toEqual([]);
      });

      it('should return all tasks for a repo', async () => {
        createTask(testRepo.id, { id: 'task-1', title: 'Task 1' });
        createTask(testRepo.id, { id: 'task-2', title: 'Task 2' });

        const caller = appRouter.createCaller(createContext());
        const result = await caller.getTasks({ repoPath: testRepoPath });

        expect(result).toHaveLength(2);
        expect(result.some(t => t.id === 'task-1')).toBe(true);
        expect(result.some(t => t.id === 'task-2')).toBe(true);
      });
    });

    describe('createTask', () => {
      it('should create a new task and persist it', async () => {
        const caller = appRouter.createCaller(createContext());

        const result = await caller.createTask({
          repoPath: testRepoPath,
          title: 'New Task',
          description: 'Task description',
        });

        expect(result.id).toBeDefined();
        expect(result.title).toBe('New Task');
        expect(result.description).toBe('Task description');

        // Verify persistence
        const tasks = getTasks(testRepo.id);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe(result.id);
      });

      it('should call side effect functions', async () => {
        const caller = appRouter.createCaller(createContext());

        await caller.createTask({
          repoPath: testRepoPath,
          title: 'New Task',
        });

        expect(mockCreateWorktree).toHaveBeenCalled();
        expect(mockEnsureTerminalForTask).toHaveBeenCalled();
        expect(mockRunAiForTask).toHaveBeenCalled();
      });
    });

    describe('updateTask', () => {
      it('should update task details', async () => {
        const t = createTask(testRepo.id, { id: 'task-1', title: 'Old Title' });

        const caller = appRouter.createCaller(createContext());
        const result = await caller.updateTask({
          repoPath: testRepoPath,
          id: 'task-1',
          updates: { title: 'New Title' },
        });

        expect(result.title).toBe('New Title');

        const updated = getTaskById('task-1');
        expect(updated?.title).toBe('New Title');
      });

      it('should throw error when task does not exist', async () => {
        const caller = appRouter.createCaller(createContext());

        await expect(
          caller.updateTask({
            repoPath: testRepoPath,
            id: 'non-existent',
            updates: { title: 'New Title' },
          })
        ).rejects.toThrow('Task not found');
      });
    });

    describe('deleteTask', () => {
      it('should delete task and call cleanup side effects', async () => {
        createTask(testRepo.id, { id: 'task-1', title: 'To Delete' });

        const caller = appRouter.createCaller(createContext());
        const result = await caller.deleteTask({ repoPath: testRepoPath, taskId: 'task-1' });

        expect(result.success).toBe(true);
        expect(getTaskById('task-1')).toBeUndefined();
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
        const result = await caller.getGitStatus({ repoPath: testRepoPath });

        expect(result.branch).toBeDefined();
        expect(result.status).toBeDefined();
      });
    });

    describe('createCommit', () => {
      it('should create a commit', async () => {
        fs.writeFileSync(path.join(testRepoPath, 'new.txt'), 'new content');

        const caller = appRouter.createCaller(createContext());
        const result = await caller.createCommit({
          repoPath: testRepoPath,
          message: 'Test commit',
        });

        expect(result.success).toBe(true);

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
      });
    });
  });
});
