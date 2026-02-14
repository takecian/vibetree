import fs from 'fs';
import path from 'path';

function normalizePath(p: string): string {
    return p.replace(/[/\\]+$/, '');
}
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { DBData } from './types'; // Import the DBData interface

let dbs: Map<string, Low<DBData>> = new Map();

async function initDB(repoPath: string): Promise<Low<DBData>> {
    const normalizedPath = normalizePath(repoPath);
    if (dbs.has(normalizedPath)) return dbs.get(normalizedPath)!;

    const vibeDir = path.join(normalizedPath, '.vibetree');
    if (!fs.existsSync(vibeDir)) {
        fs.mkdirSync(vibeDir, { recursive: true });
    }

    const file = path.join(vibeDir, 'db.json');
    const adapter = new JSONFile<DBData>(file);
    const db = new Low<DBData>(adapter, { tasks: [] });

    await db.read();
    db.data ||= { tasks: [] };
    await db.write();

    dbs.set(normalizedPath, db);
    console.log(`[DB] Initialized at ${file}`);
    return db;
}

function getDB(repoPath: string): Low<DBData> {
    const normalizedPath = normalizePath(repoPath);
    const db = dbs.get(normalizedPath);
    if (!db) throw new Error(`DB not initialized for path: ${normalizedPath}`);
    return db;
}

function clearDBs() {
    dbs.clear();
}

export { initDB, getDB, clearDBs };
