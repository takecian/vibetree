import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchTasks, updateTask as updateTaskApi, createTask as createTaskApi, deleteTask as deleteTaskApi, fetchConfig, updateConfig as updateConfigApi } from '../api';
import { Task, AppConfig } from '../types'; // Import Task and AppConfig interfaces

// Define the shape of the context value
interface TaskContextType {
    tasks: Task[];
    config: AppConfig | null;
    loading: boolean;
    isConnected: boolean;
    setRepoPath: (path: string, aiTool: string, copyFiles?: string) => Promise<void>;
    moveTask: (taskId: string, newStatus: Task['status']) => Promise<void>;
    addTask: (title: string, description: string) => Promise<Task>;
    deleteTask: (taskId: string) => Promise<void>;
    refreshTasks: () => Promise<void>;
}

// Create context with a default undefined value, asserting it will be provided
const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
    children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    const refreshConfig = async () => {
        try {
            const data: AppConfig = await fetchConfig();
            setConfig(data);
            if (data.repoPath) {
                setIsConnected(true);
                await refreshTasks();
            } else {
                setIsConnected(false);
                setLoading(false);
            }
        } catch (e) {
            console.error("Failed to load config", e);
            setLoading(false);
        }
    };

    const refreshTasks = async () => {
        setLoading(true);
        try {
            const data: Task[] = await fetchTasks();
            setTasks(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshConfig();
    }, []);

    const setRepoPath = async (path: string, aiTool: string, copyFiles?: string) => {
        const newHelper: AppConfig = {
            repoPath: path,
            aiTool: aiTool || config?.aiTool || 'claude',
            copyFiles: copyFiles !== undefined ? copyFiles : config?.copyFiles ?? ''
        };

        const updatedConfig: AppConfig = await updateConfigApi(newHelper);
        setConfig(updatedConfig);
        if (updatedConfig.repoPath) {
            setIsConnected(true);
            await refreshTasks();
        }
    };

    const moveTask = async (taskId: string, newStatus: Task['status']) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        await updateTaskApi(taskId, { status: newStatus });
    };

    const addTask = async (title: string, description: string): Promise<Task> => {
        const newTask: Task = await createTaskApi(title, description);
        setTasks(prev => [...prev, newTask]);
        return newTask;
    };

    const deleteTask = async (taskId: string) => {
        await deleteTaskApi(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const contextValue: TaskContextType = {
        tasks,
        config,
        loading,
        isConnected,
        setRepoPath,
        moveTask,
        addTask,
        deleteTask,
        refreshTasks
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
