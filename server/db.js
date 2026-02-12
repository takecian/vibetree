const fs = require('fs');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

let db;

async function initDB(repoPath) {
    const vibeDir = path.join(repoPath, '.vibe-flow');
    if (!fs.existsSync(vibeDir)) {
        fs.mkdirSync(vibeDir, { recursive: true });
    }

    const file = path.join(vibeDir, 'db.json');
    const adapter = new JSONFile(file);
    db = new Low(adapter, { tasks: [] }); // Default data

    await db.read();
    db.data ||= { tasks: [] }; // Initialize if empty
    await db.write();

    console.log(`[DB] Initialized at ${file}`);
    return db;
}

function getDB() {
    if (!db) throw new Error('DB not initialized');
    return db;
}

module.exports = { initDB, getDB };
