const API_URL = 'http://localhost:3000/api';

export async function fetchConfig() {
    const res = await fetch(`${API_URL}/config`);
    return res.json();
}

export async function updateConfig(config) {
    const res = await fetch(`${API_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    });
    return res.json();
}

export async function fetchTasks() {
    const res = await fetch(`${API_URL}/tasks`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
}

export async function createTask(title, description) {
    const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
    });
    return res.json();
}

export async function updateTask(id, updates) {
    const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    return res.json();
}

export async function createWorktree(taskId, branchName) {
    const res = await fetch(`${API_URL}/git/worktree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, branchName })
    });
    return res.json();
}

export async function getGitStatus() {
    const res = await fetch(`${API_URL}/git/status`);
    return res.json();
}

export async function pickFolder() {
    const res = await fetch(`${API_URL}/system/pick-folder`);
    return res.json();
}
export async function checkAITools() {
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
