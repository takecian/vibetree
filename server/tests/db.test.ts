import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getRepositories,
  getRepositoryByPath,
  addRepository,
  getTasks,
  createTask,
  clearDB,
  normalizePath
} from '../src/services/db';

describe('db', () => {
  beforeEach(() => {
    clearDB();
  });

  afterEach(() => {
    clearDB();
  });

  describe('Repository Operations', () => {
    it('should add and retrieve a repository', () => {
      const repo = addRepository('/test/repo');
      expect(repo.path).toBe('/test/repo');

      const all = getRepositories();
      expect(all).toHaveLength(1);
      expect(all[0].path).toBe('/test/repo');
    });

    it('should normalize paths on add', () => {
      addRepository('/test/repo/');
      const repo = getRepositoryByPath('/test/repo');
      expect(repo).toBeDefined();
      expect(repo?.path).toBe('/test/repo');
    });

    it('should not add duplicate repositories', () => {
      addRepository('/test/repo');
      addRepository('/test/repo');
      expect(getRepositories()).toHaveLength(1);
    });
  });

  describe('Task Operations', () => {
    it('should create and retrieve tasks for a repository', () => {
      const repo = addRepository('/test/repo');
      const task = createTask(repo.id, { title: 'Test Task' });

      expect(task.title).toBe('Test Task');
      expect(task.repositoryId).toBe(repo.id);

      const tasks = getTasks(repo.id);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(task.id);
    });

    it('should return empty array for unknown repository', () => {
      const tasks = getTasks('non-existent');
      expect(tasks).toHaveLength(0);
    });
  });

  describe('path normalization', () => {
    it('should remove trailing slashes', () => {
      expect(normalizePath('/test/path/')).toBe('/test/path');
      expect(normalizePath('/test/path//')).toBe('/test/path');
    });

    it('should handle empty paths', () => {
      expect(normalizePath('')).toBe('');
    });
  });
});
