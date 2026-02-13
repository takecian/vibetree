import React, { createContext, useContext, ReactNode } from 'react';
import { trpc } from '../trpc';
import { Task, AppConfig } from '../types';

interface TaskContextType {
    tasks: Task[];
    config: AppConfig | null;
    loading: boolean;
    isConnected: boolean;
    setRepoPath: (path: string, aiTool: string, copyFiles?: string) => Promise<void>;
    addTask: (title: string, description: string) => Promise<Task>;
    deleteTask: (taskId: string) => Promise<void>;
    refreshTasks: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
    children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
    const utils = trpc.useUtils();

    // Queries
    const { data: config = null, isLoading: configLoading } = trpc.getConfig.useQuery();
    const { data: tasks = [], isLoading: tasksLoading, refetch: refreshTasks } = trpc.getTasks.useQuery(undefined, {
        enabled: !!config?.repoPath,
    });

    // Mutations
    const updateConfigMutation = trpc.updateConfig.useMutation({
        onSuccess: (newConfig) => {
            utils.getConfig.setData(undefined, newConfig);
            utils.getTasks.invalidate();
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

    const setRepoPath = async (path: string, aiTool: string, copyFiles?: string) => {
        await updateConfigMutation.mutateAsync({
            repoPath: path,
            aiTool: aiTool || config?.aiTool || 'claude',
            copyFiles: copyFiles !== undefined ? copyFiles : config?.copyFiles ?? ''
        });
    };

    const addTask = async (title: string, description: string): Promise<Task> => {
        return await createTaskMutation.mutateAsync({ title, description });
    };

    const deleteTask = async (taskId: string) => {
        await deleteTaskMutation.mutateAsync(taskId);
    };

    const contextValue: TaskContextType = {
        tasks,
        config,
        loading: configLoading || tasksLoading,
        isConnected: !!config?.repoPath,
        setRepoPath,
        addTask,
        deleteTask,
        refreshTasks: () => { refreshTasks(); }
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
