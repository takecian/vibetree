import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { runGit, createWorktree } from './git';

const execAsync = util.promisify(exec);

describe('git', () => {
  let testRepoPath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testRepoPath = path.join(os.tmpdir(), `vibetree-git-test-${Date.now()}`);
    fs.mkdirSync(testRepoPath, { recursive: true });

    // Initialize a git repository
    await execAsync('git init', { cwd: testRepoPath });
    await execAsync('git config user.email "test@example.com"', { cwd: testRepoPath });
    await execAsync('git config user.name "Test User"', { cwd: testRepoPath });
    
    // Create an initial commit
    const testFile = path.join(testRepoPath, 'test.txt');
    fs.writeFileSync(testFile, 'initial content');
    await execAsync('git add .', { cwd: testRepoPath });
    await execAsync('git commit -m "Initial commit"', { cwd: testRepoPath });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('runGit', () => {
    it('should execute git command and return stdout', async () => {
      const result = await runGit('git branch --show-current', testRepoPath, testRepoPath);
      
      // Git default branch can be 'master' or 'main' depending on Git version
      expect(['master', 'main']).toContain(result);
    });

    it('should throw error when command fails', async () => {
      await expect(
        runGit('git invalid-command', testRepoPath, testRepoPath)
      ).rejects.toThrow('Git command failed');
    });

    it('should throw error when repository path is not set', async () => {
      await expect(
        runGit('git status', '', '')
      ).rejects.toThrow('Repository path not set');
    });

    it('should use working directory parameter', async () => {
      const result = await runGit('git status --short', testRepoPath, testRepoPath);
      
      expect(result).toBe('');
    });

    it('should handle git status command', async () => {
      // Create a new file
      const newFile = path.join(testRepoPath, 'newfile.txt');
      fs.writeFileSync(newFile, 'new content');

      const result = await runGit('git status --short', testRepoPath, testRepoPath);
      
      expect(result).toContain('newfile.txt');
    });
  });

  describe('createWorktree', () => {
    it('should create a new worktree', async () => {
      const taskId = 'test-task-1';
      const branchName = 'feature/test';

      const result = await createWorktree(testRepoPath, taskId, branchName);

      expect(result.success).toBe(true);
      expect(result.path).toBe(path.join(testRepoPath, '.vibetree', 'worktrees', taskId));
      expect(fs.existsSync(result.path)).toBe(true);
    });

    it('should return existing worktree if it already exists', async () => {
      const taskId = 'test-task-2';
      const branchName = 'feature/test2';

      await createWorktree(testRepoPath, taskId, branchName);
      const result = await createWorktree(testRepoPath, taskId, branchName);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Worktree already exists');
    });

    it('should create a new branch if it does not exist', async () => {
      const taskId = 'test-task-3';
      const branchName = 'feature/new-branch';

      await createWorktree(testRepoPath, taskId, branchName);

      const worktreePath = path.join(testRepoPath, '.vibetree', 'worktrees', taskId);
      const { stdout } = await execAsync('git branch --show-current', { cwd: worktreePath });
      
      expect(stdout.trim()).toBe(branchName);
    });

    it('should throw error when repository is not set', async () => {
      await expect(
        createWorktree('', 'task-id', 'branch')
      ).rejects.toThrow('Repository not selected');
    });

    it('should copy files to worktree when copyFiles is provided', async () => {
      const taskId = 'test-task-4';
      const branchName = 'feature/test4';
      
      // Create a file to copy
      const sourceFile = path.join(testRepoPath, '.env');
      fs.writeFileSync(sourceFile, 'TEST=value');

      const result = await createWorktree(testRepoPath, taskId, branchName, '.env');

      const worktreePath = path.join(testRepoPath, '.vibetree', 'worktrees', taskId);
      const copiedFile = path.join(worktreePath, '.env');
      
      expect(fs.existsSync(copiedFile)).toBe(true);
      expect(fs.readFileSync(copiedFile, 'utf8')).toBe('TEST=value');
    });

    it('should handle multiple files in copyFiles parameter', async () => {
      const taskId = 'test-task-5';
      const branchName = 'feature/test5';
      
      // Create files to copy
      fs.writeFileSync(path.join(testRepoPath, '.env'), 'ENV=test');
      fs.writeFileSync(path.join(testRepoPath, 'config.json'), '{"test": true}');

      await createWorktree(testRepoPath, taskId, branchName, '.env\nconfig.json');

      const worktreePath = path.join(testRepoPath, '.vibetree', 'worktrees', taskId);
      
      expect(fs.existsSync(path.join(worktreePath, '.env'))).toBe(true);
      expect(fs.existsSync(path.join(worktreePath, 'config.json'))).toBe(true);
    });

    it('should skip copying non-existent files', async () => {
      const taskId = 'test-task-6';
      const branchName = 'feature/test6';

      // Should not throw error, just skip the file
      const result = await createWorktree(
        testRepoPath, 
        taskId, 
        branchName, 
        'nonexistent.txt'
      );

      expect(result.success).toBe(true);
    });

    it('should skip copying directories', async () => {
      const taskId = 'test-task-7';
      const branchName = 'feature/test7';
      
      // Create a directory
      const dirPath = path.join(testRepoPath, 'somedir');
      fs.mkdirSync(dirPath);

      const result = await createWorktree(testRepoPath, taskId, branchName, 'somedir');

      expect(result.success).toBe(true);
      const worktreePath = path.join(testRepoPath, '.vibetree', 'worktrees', taskId);
      expect(fs.existsSync(path.join(worktreePath, 'somedir'))).toBe(false);
    });
  });
});
