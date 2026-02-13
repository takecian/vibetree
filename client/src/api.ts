const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

import { AppConfig, Task, GitStatus, PickFolderResult, AiToolsCheckResult } from './types';

export async function fetchConfig(): Promise<AppConfig> {
    const res = await fetch(`${API_URL}/config`);
    if (!res.ok) throw new Error(`Failed to fetch config (${res.status})`);
    return res.json();
}

export async function updateConfig(config: AppConfig): Promise<AppConfig> {
    const res = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to update config (${res.status})`);
    }
    return res.json();
}

export async function fetchTasks(): Promise<Task[]> {
    const res = await fetch(`${API_URL}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
}

export async function createTask(title: string, description: string): Promise<Task> {
    const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
    });
    return res.json();
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    return res.json();
}

export async function deleteTask(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
}

export async function createWorktree(taskId: string, branchName: string): Promise<{ success: boolean; path: string; message?: string }> {
    const res = await fetch(`${API_URL}/git/worktree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, branchName })
    });
    return res.json();
}

export async function getGitStatus(): Promise<GitStatus> {
    const res = await fetch(`${API_URL}/git/status`);
    return res.json();
}

export async function pickFolder(): Promise<PickFolderResult> {
    const res = await fetch(`${API_URL}/system/pick-folder`);
    return res.json();
}

export async function checkAITools(): Promise<AiToolsCheckResult> {
    try {
        const res = await fetch(`${API_URL}/system/ai-tools`);
        const data = await res.json();
        console.log('AI Tools API Response:', data);
        return data;
    } catch (e) {
        console.error('Error checking AI tools:', e);
        return {};
    }
}
