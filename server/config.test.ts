import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, saveConfig } from './config';
import { AppConfig } from './types';

// Mock the config file path
const mockConfigPath = path.join(os.homedir(), '.vibetree_config.json');

describe('config', () => {
  beforeEach(() => {
    // Clean up any existing config file before each test
    if (fs.existsSync(mockConfigPath)) {
      fs.unlinkSync(mockConfigPath);
    }
    // Clear environment variables
    delete process.env.REPO_PATH;
    delete process.env.AI_TOOL;
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(mockConfigPath)) {
      fs.unlinkSync(mockConfigPath);
    }
    delete process.env.REPO_PATH;
    delete process.env.AI_TOOL;
  });

  describe('loadConfig', () => {
    it('should return default config when no config file exists', () => {
      const config = loadConfig();
      expect(config).toEqual({
        repoPath: '',
        aiTool: 'claude',
        copyFiles: '',
      });
    });

    it('should load config from file when it exists', () => {
      const testConfig: AppConfig = {
        repoPath: '/test/repo',
        aiTool: 'codex',
        copyFiles: '.env',
      };
      fs.writeFileSync(mockConfigPath, JSON.stringify(testConfig));

      const config = loadConfig();
      expect(config).toEqual(testConfig);
    });

    it('should prioritize environment variables over config file', () => {
      const testConfig: AppConfig = {
        repoPath: '/test/repo',
        aiTool: 'codex',
        copyFiles: '.env',
      };
      fs.writeFileSync(mockConfigPath, JSON.stringify(testConfig));

      process.env.REPO_PATH = '/env/repo';
      process.env.AI_TOOL = 'gemini';

      const config = loadConfig();
      expect(config.repoPath).toBe('/env/repo');
      expect(config.aiTool).toBe('gemini');
      expect(config.copyFiles).toBe('.env');
    });

    it('should handle snake_case copy_files for backward compatibility', () => {
      const testConfig = {
        repoPath: '/test/repo',
        aiTool: 'codex',
        copy_files: '.env\n.env.local',
      };
      fs.writeFileSync(mockConfigPath, JSON.stringify(testConfig));

      const config = loadConfig();
      expect(config.copyFiles).toBe('.env\n.env.local');
    });

    it('should handle corrupted config file gracefully', () => {
      fs.writeFileSync(mockConfigPath, 'invalid json content');

      const config = loadConfig();
      expect(config).toEqual({
        repoPath: '',
        aiTool: 'claude',
        copyFiles: '',
      });
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const testConfig: AppConfig = {
        repoPath: '/test/repo',
        aiTool: 'codex',
        copyFiles: '.env',
      };

      await saveConfig(testConfig);

      expect(fs.existsSync(mockConfigPath)).toBe(true);
      const savedData = JSON.parse(fs.readFileSync(mockConfigPath, 'utf8'));
      expect(savedData).toEqual(testConfig);
    });

    it('should format saved JSON with indentation', async () => {
      const testConfig: AppConfig = {
        repoPath: '/test/repo',
        aiTool: 'codex',
        copyFiles: '.env',
      };

      await saveConfig(testConfig);

      const savedContent = fs.readFileSync(mockConfigPath, 'utf8');
      expect(savedContent).toContain('\n');
      expect(savedContent).toContain('  ');
    });

    it('should handle empty strings in config', async () => {
      const testConfig: AppConfig = {
        repoPath: '',
        aiTool: '',
        copyFiles: '',
      };

      await saveConfig(testConfig);

      expect(fs.existsSync(mockConfigPath)).toBe(true);
      const savedData = JSON.parse(fs.readFileSync(mockConfigPath, 'utf8'));
      expect(savedData).toEqual(testConfig);
    });
  });
});
