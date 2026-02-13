// server/types.ts
export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled';
    createdAt: string;
    branchName: string;
    // Add any other properties your tasks might have
}

export interface DBData {
    tasks: Task[];
    // Add any other top-level data structures in your db.json
}

export interface AppConfig {
    repoPath: string;
    aiTool: string;
    /** Newline-separated file paths (relative to repo or absolute) to copy into each worktree */
    copyFiles?: string;
}

// Extend process.env for custom environment variables
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            TASK_ID?: string;
            TASK_TITLE?: string;
            TASK_DESCRIPTION?: string;
            TASK_STATUS?: string;
            // Add other custom env vars here
        }
    }
}
