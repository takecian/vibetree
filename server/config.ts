import fs from 'fs';
import path from 'path';
import os from 'os';
import { AppConfig } from './types';

const CONFIG_FILE = path.join(os.homedir(), '.vibetree_config.json');

export function loadConfig(): AppConfig {
    const defaultConfig: AppConfig = {
        repoPath: process.env.REPO_PATH || '',
        aiTool: process.env.AI_TOOL || 'claude',
        copyFiles: ''
    };

    if (!fs.existsSync(CONFIG_FILE)) {
        return defaultConfig;
    }

    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        const normalize = (p: string) => p ? p.replace(/[/\\]+$/, '') : '';
        const persisted = JSON.parse(data);
        const repoPath = persisted.repoPath ? normalize(persisted.repoPath) : '';

        return {
            repoPath: process.env.REPO_PATH || repoPath || defaultConfig.repoPath,
            aiTool: process.env.AI_TOOL || persisted.aiTool || defaultConfig.aiTool,
            copyFiles: persisted.copyFiles !== undefined ? persisted.copyFiles : persisted.copy_files
        };
    } catch (e) {
        console.error('[Config] Failed to load config:', e);
        return defaultConfig;
    }
}

export async function saveConfig(config: AppConfig): Promise<void> {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`[Config] Saved to ${CONFIG_FILE}`);
    } catch (e) {
        console.error('[Config] Failed to save config:', e);
    }
}
