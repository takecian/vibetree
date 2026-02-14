import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { initDB, getDB } from './db';

describe('db', () => {
  let testRepoPath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testRepoPath = path.join(os.tmpdir(), `vibetree-test-${Date.now()}`);
    fs.mkdirSync(testRepoPath, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  describe('initDB', () => {
    it('should create .vibetree directory if it does not exist', async () => {
      await initDB(testRepoPath);

      const vibeDir = path.join(testRepoPath, '.vibetree');
      expect(fs.existsSync(vibeDir)).toBe(true);
    });

    it('should create db.json file', async () => {
      await initDB(testRepoPath);

      const dbFile = path.join(testRepoPath, '.vibetree', 'db.json');
      expect(fs.existsSync(dbFile)).toBe(true);
    });

    it('should initialize db with empty tasks array', async () => {
      await initDB(testRepoPath);

      const dbFile = path.join(testRepoPath, '.vibetree', 'db.json');
      const dbContent = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      expect(dbContent).toEqual({ tasks: [] });
    });

    it('should work if .vibetree directory already exists', async () => {
      const vibeDir = path.join(testRepoPath, '.vibetree');
      fs.mkdirSync(vibeDir);

      await initDB(testRepoPath);

      const dbFile = path.join(vibeDir, 'db.json');
      expect(fs.existsSync(dbFile)).toBe(true);
    });

    it('should return a Low database instance', async () => {
      const db = await initDB(testRepoPath);

      expect(db).toBeDefined();
      expect(db.read).toBeDefined();
      expect(db.write).toBeDefined();
      expect(db.data).toBeDefined();
    });

    it('should preserve existing data if db.json exists', async () => {
      const vibeDir = path.join(testRepoPath, '.vibetree');
      fs.mkdirSync(vibeDir, { recursive: true });
      
      const existingData = {
        tasks: [
          {
            id: 'test-1',
            title: 'Test Task',
            description: 'Test Description',
            createdAt: '2024-01-01',
            branchName: 'test-branch',
          },
        ],
      };
      fs.writeFileSync(
        path.join(vibeDir, 'db.json'),
        JSON.stringify(existingData)
      );

      const db = await initDB(testRepoPath);
      await db.read();

      expect(db.data.tasks).toHaveLength(1);
      expect(db.data.tasks[0].id).toBe('test-1');
    });
  });

  describe('getDB', () => {
    it('should return the initialized database', async () => {
      await initDB(testRepoPath);
      const db = getDB();

      expect(db).toBeDefined();
      expect(db.data).toBeDefined();
    });

    it('should return the same instance across multiple calls', async () => {
      await initDB(testRepoPath);
      const db1 = getDB();
      const db2 = getDB();

      expect(db1).toBe(db2);
    });
  });
});
