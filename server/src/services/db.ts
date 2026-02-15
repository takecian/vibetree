import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { Repository, Task } from '../types';

const VIBE_DIR = path.join(os.homedir(), '.vibetree');
const DB_PATH = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(VIBE_DIR, 'vibetree.db');

if (DB_PATH !== ':memory:' && !fs.existsSync(VIBE_DIR)) {
    fs.mkdirSync(VIBE_DIR, { recursive: true });
}

console.log(`[DB] Initializing SQLite database at: ${DB_PATH}`);
const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
    CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        copy_files TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        branch_name TEXT,
        pr_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
    );
`);

// Simple migration check for existing databases
try {
    db.exec("ALTER TABLE tasks ADD COLUMN pr_url TEXT");
    console.log("[DB] Added pr_url column to tasks table");
} catch (e: any) {
    // If it fails, it likely already exists
    if (!e.message.includes('duplicate column name')) {
        console.error("[DB] Migration failed:", e.message);
    }
}

export function normalizePath(p: string): string {
    return p ? p.replace(/[/\\]+$/, '') : '';
}

// Repository Operations
export function getRepositories(): Repository[] {
    const rows = db.prepare('SELECT * FROM repositories').all();
    return rows.map((row: any) => ({
        id: row.id,
        path: row.path,
        copyFiles: row.copy_files
    }));
}

export function getRepositoryById(id: string): Repository | undefined {
    const row: any = db.prepare('SELECT * FROM repositories WHERE id = ?').get(id);
    if (!row) return undefined;
    return {
        id: row.id,
        path: row.path,
        copyFiles: row.copy_files
    };
}

export function getRepositoryByPath(rawPath: string): Repository | undefined {
    const normalized = normalizePath(rawPath);
    const row: any = db.prepare('SELECT * FROM repositories WHERE path = ?').get(normalized);
    if (!row) return undefined;
    return {
        id: row.id,
        path: row.path,
        copyFiles: row.copy_files
    };
}

export function addRepository(rawPath: string, copyFiles?: string): Repository {
    const normalized = normalizePath(rawPath);
    const existing = getRepositoryByPath(normalized);
    if (existing) return existing;

    const id = uuidv4();
    db.prepare('INSERT INTO repositories (id, path, copy_files) VALUES (?, ?, ?)')
        .run(id, normalized, copyFiles || '');

    return { id, path: normalized, copyFiles };
}

export function updateRepository(id: string, updates: { path?: string; copyFiles?: string }): Repository {
    if (updates.path) updates.path = normalizePath(updates.path);

    const fields = [];
    const values = [];
    if (updates.path !== undefined) {
        fields.push('path = ?');
        values.push(updates.path);
    }
    if (updates.copyFiles !== undefined) {
        fields.push('copy_files = ?');
        values.push(updates.copyFiles);
    }

    if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE repositories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return getRepositoryById(id)!;
}

export function deleteRepository(id: string) {
    db.prepare('DELETE FROM repositories WHERE id = ?').run(id);
}

// Task Operations
export function getTasks(repositoryId: string | null): Task[] {
    let query = 'SELECT * FROM tasks';
    const params = [];

    if (repositoryId) {
        query += ' WHERE repository_id = ?';
        params.push(repositoryId);
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params);
    return rows.map((row: any) => ({
        id: row.id,
        repositoryId: row.repository_id,
        title: row.title,
        description: row.description || '',
        branchName: row.branch_name || '',
        prUrl: row.pr_url || '',
        createdAt: row.created_at
    }));
}

export function getTaskById(id: string): Task | undefined {
    const row: any = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) return undefined;
    return {
        id: row.id,
        repositoryId: row.repository_id,
        title: row.title,
        description: row.description || '',
        branchName: row.branch_name || '',
        prUrl: row.pr_url || '',
        createdAt: row.created_at
    };
}

export function createTask(repositoryId: string, task: Partial<Task>): Task {
    const id = task.id || uuidv4();
    const title = task.title || 'New Task';
    const description = task.description || '';
    const branchName = task.branchName || '';
    const createdAt = task.createdAt || new Date().toISOString();

    db.prepare(`
        INSERT INTO tasks (id, repository_id, title, description, branch_name, pr_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, repositoryId, title, description, branchName, task.prUrl || '', createdAt);

    return {
        id,
        repositoryId,
        title,
        description,
        branchName,
        prUrl: task.prUrl || '',
        createdAt
    };
}

export function updateTask(id: string, updates: Partial<Task>): Task {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
    }
    if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
    }
    if (updates.branchName !== undefined) {
        fields.push('branch_name = ?');
        values.push(updates.branchName);
    }
    if (updates.prUrl !== undefined) {
        fields.push('pr_url = ?');
        values.push(updates.prUrl);
    }

    if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return getTaskById(id)!;
}

export function deleteTask(id: string) {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}

// For testing
export function clearDB() {
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM repositories').run();
}

// Legacy compatibility (re-routing calls)
export async function initDB(repoPath: string) {
    // New system doesn't need explicit init per repo, but we ensure it exists
    addRepository(repoPath);
}

export function getDB(repoPath: string) {
    // This is legacy from lowdb, we should refactor away from it
    // But for compatibility during migration:
    return {
        read: async () => { },
        write: async () => { },
        data: { tasks: getTasks(getRepositoryByPath(repoPath)?.id || null) }
    };
}
