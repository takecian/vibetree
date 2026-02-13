import fs from 'fs';
import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { DBData } from './types'; // Import the DBData interface

let db: Low<DBData>;

async function initDB(repoPath: string): Promise<Low<DBData>> {
    const vibeDir = path.join(repoPath, '.vibetree');
    if (!fs.existsSync(vibeDir)) {
        fs.mkdirSync(vibeDir, { recursive: true });
    }

    const file = path.join(vibeDir, 'db.json');
    const adapter = new JSONFile<DBData>(file);
    db = new Low<DBData>(adapter, { tasks: [] }); // Default data with type

    await db.read();
    db.data ||= { tasks: [] }; // Initialize if empty
    await db.write();

    console.log(`[DB] Initialized at ${file}`);
    return db;
}

function getDB(): Low<DBData> {
    if (!db) throw new Error('DB not initialized');
    return db;
}

export { initDB, getDB };
