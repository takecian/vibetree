// client/src/types.ts

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'inprogress' | 'inreview' | 'done' | 'cancelled';
    createdAt: string;
    branchName?: string;
}

export interface AppConfig {
    repoPath: string;
    aiTool: string;
    /** Newline-separated file paths (relative to repo or absolute) to copy into each worktree */
    copyFiles?: string;
}

export interface GitStatus {
    branch: string;
    status: string;
}

export interface PickFolderResult {
    path?: string;
    canceled?: boolean;
}

export interface AiToolsCheckResult {
    claude?: boolean;
    codex?: boolean;
    gemini?: boolean;
}