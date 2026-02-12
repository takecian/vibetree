const { getDB } = require('./db');
const { v4: uuidv4 } = require('uuid');

function setupTaskRoutes(app, getState, createWorktree) {

    // Middleware to ensure DB is ready or check path
    const checkDB = (req, res, next) => {
        if (!getState().repoPath) {
            return res.status(400).json({ error: 'Repository not selected' });
        }
        // TODO: ensure DB is initialized for this path
        next();
    };

    app.get('/api/tasks', checkDB, async (req, res) => {
        try {
            const db = getDB();
            await db.read();
            res.json(db.data.tasks);
        } catch (e) {
            res.status(500).json({ error: 'Failed to read tasks' });
        }
    });

    app.post('/api/tasks', checkDB, async (req, res) => {
        const { title, description, status } = req.body;
        const db = getDB();
        const newTask = {
            id: uuidv4(),
            title,
            description,
            status: status || 'todo',
            createdAt: new Date().toISOString(),
            branchName: `feature/task-${Date.now()}`
        };
        db.data.tasks.push(newTask);
        await db.write();

        // Auto-create worktree
        try {
            if (createWorktree) {
                const { repoPath } = getState();
                await createWorktree(repoPath, newTask.id, newTask.branchName);
                console.log(`Auto-created worktree for task ${newTask.id}`);
            }
        } catch (e) {
            console.error(`Failed to auto-create worktree for task ${newTask.id}:`, e);
            // Don't fail the request, just log it. User can retry via UI.
        }

        res.json(newTask);
    });

    app.put('/api/tasks/:id', checkDB, async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        const db = getDB();
        const taskIndex = db.data.tasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            db.data.tasks[taskIndex] = { ...db.data.tasks[taskIndex], ...updates };
            await db.write();
            res.json(db.data.tasks[taskIndex]);
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    });

    app.delete('/api/tasks/:id', checkDB, async (req, res) => {
        const { id } = req.params;
        const db = getDB();
        db.data.tasks = db.data.tasks.filter(t => t.id !== id);
        await db.write();
        res.json({ success: true });
    });
}

module.exports = { setupTaskRoutes };
