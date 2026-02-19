import { createContext, useContext, ReactNode } from 'react';
import { trpc } from '../api/trpc';
import { Repository, Task, AppConfig } from '../types';

interface TaskContextType {
    config: AppConfig | null;
    repositories: Repository[];
    loading: boolean;
    updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
    addTask: (repoPath: string, title: string, description: string) => Promise<Task>;
    deleteTask: (repoPath: string, taskId: string) => Promise<void>;
    addRepository: (path: string, copyFiles?: string, worktreePath?: string, aiTool?: string) => Promise<Repository>;
    updateRepository: (id: string, updates: { path?: string; copyFiles?: string; worktreePath?: string; aiTool?: string }) => Promise<Repository>;
    deleteRepository: (id: string) => Promise<void>;
    createTaskMutation: ReturnType<typeof trpc.createTask.useMutation>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
    children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
    const utils = trpc.useUtils();

    // Queries
    const { data: config = null, isLoading: configLoading } = trpc.getConfig.useQuery();
    const { data: repositories = [], isLoading: reposLoading } = trpc.getRepositories.useQuery();

    // Mutations
    const updateConfigMutation = trpc.updateConfig.useMutation({
        onSuccess: (newConfig) => {
            utils.getConfig.setData(undefined, newConfig);
        }
    });

    const addRepositoryMutation = trpc.addRepository.useMutation({
        onSuccess: () => {
            utils.getRepositories.invalidate();
        }
    });

    const createTaskMutation = trpc.createTask.useMutation({
        onSuccess: () => {
            utils.getTasks.invalidate();
        }
    });
    const deleteTaskMutation = trpc.deleteTask.useMutation({
        onSuccess: () => {
            utils.getTasks.invalidate();
        }
    });

    const updateRepositoryMutation = trpc.updateRepository.useMutation({
        onSuccess: () => {
            utils.getRepositories.invalidate();
        }
    });

    const deleteRepositoryMutation = trpc.deleteRepository.useMutation({
        onSuccess: () => {
            utils.getRepositories.invalidate();
        }
    });

    const updateConfig = async (updates: Partial<AppConfig>) => {
        await updateConfigMutation.mutateAsync(updates);
    };

    const addRepository = async (path: string, copyFiles?: string, worktreePath?: string, aiTool?: string): Promise<Repository> => {
        return await addRepositoryMutation.mutateAsync({ path, copyFiles, worktreePath, aiTool });
    };

    const updateRepository = async (id: string, updates: { path?: string; copyFiles?: string; worktreePath?: string; aiTool?: string }): Promise<Repository> => {
        return await updateRepositoryMutation.mutateAsync({ id, updates });
    };

    const addTask = async (repoPath: string, title: string, description: string): Promise<Task> => {
        return await createTaskMutation.mutateAsync({ repoPath, title, description });
    };

    const deleteTask = async (repoPath: string, taskId: string) => {
        await deleteTaskMutation.mutateAsync({ repoPath, taskId });
    };

    const deleteRepository = async (id: string) => {
        await deleteRepositoryMutation.mutateAsync({ id });
    };

    const contextValue: TaskContextType = {
        config,
        repositories,
        loading: configLoading || reposLoading,
        updateConfig,
        addTask,
        deleteTask,
        addRepository,
        updateRepository,
        deleteRepository,
        createTaskMutation,
    };

    return (
        <TaskContext.Provider value={contextValue}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
}
