import { createContext, useContext, ReactNode } from 'react';
import { trpc } from '../trpc';
import { Task, AppConfig } from '../types';

interface TaskContextType {
    config: AppConfig | null;
    loading: boolean;
    updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
    addTask: (repoPath: string, title: string, description: string) => Promise<Task>;
    deleteTask: (repoPath: string, taskId: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
    children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
    const utils = trpc.useUtils();

    // Queries
    const { data: config = null, isLoading: configLoading } = trpc.getConfig.useQuery();

    // Mutations
    const updateConfigMutation = trpc.updateConfig.useMutation({
        onSuccess: (newConfig) => {
            utils.getConfig.setData(undefined, newConfig);
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

    const updateConfig = async (updates: Partial<AppConfig>) => {
        await updateConfigMutation.mutateAsync(updates);
    };

    const addTask = async (repoPath: string, title: string, description: string): Promise<Task> => {
        return await createTaskMutation.mutateAsync({ repoPath, title, description });
    };

    const deleteTask = async (repoPath: string, taskId: string) => {
        await deleteTaskMutation.mutateAsync({ repoPath, taskId });
    };

    const contextValue: TaskContextType = {
        config,
        loading: configLoading,
        updateConfig,
        addTask,
        deleteTask,
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
