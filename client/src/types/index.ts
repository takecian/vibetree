// client/src/types.ts

export interface Repository {
    id: string;
    path: string;
    copyFiles?: string;
    worktreePath?: string;
    aiTool?: string;
    aiToolMode?: string;
}

export interface Task {
    id: string;
    repositoryId: string;
    title: string;
    description: string;
    createdAt: string;
    branchName?: string;
    prUrl?: string;
    prMerged?: boolean;
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
