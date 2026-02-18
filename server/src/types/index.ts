export interface Repository {
    id: string;
    path: string;
    copyFiles?: string;
    worktreePath?: string;
}

export interface Task {
    id: string;
    repositoryId: string;
    title: string;
    description: string;
    createdAt: string;
    branchName: string;
    prUrl?: string;
    prMerged?: boolean;
}

export interface AppConfig {
    repoPath: string; // Active repo path
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
            // Add other custom env vars here
        }
    }
}
