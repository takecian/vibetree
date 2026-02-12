import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchTasks, updateTask as updateTaskApi, createTask as createTaskApi, fetchConfig, updateConfig as updateConfigApi } from '../api';

const TaskContext = createContext();

export function TaskProvider({ children }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const refreshConfig = async () => {
        try {
            const data = await fetchConfig();
            setConfig(data);
            if (data.repoPath) {
                setIsConnected(true);
                refreshTasks();
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
            const data = await fetchTasks();
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

    const setRepoPath = async (path, aiTool) => {
        // preserve existing config if only one param passed, though modal passes both.
        const newHelper = { ...config, repoPath: path };
        if (aiTool) newHelper.aiTool = aiTool;

        const newConfig = await updateConfigApi(newHelper);
        setConfig(newConfig);
        if (newConfig.repoPath) {
            setIsConnected(true);
            refreshTasks();
        }
    };

    const moveTask = async (taskId, newStatus) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        await updateTaskApi(taskId, { status: newStatus });
    };

    const addTask = async (title, description) => {
        const newTask = await createTaskApi(title, description);
        setTasks(prev => [...prev, newTask]);
        return newTask;
    };

    return (
        <TaskContext.Provider value={{
            tasks,
            config,
            loading,
            isConnected,
            setRepoPath,
            moveTask,
            addTask,
            refreshTasks
        }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTasks() {
    return useContext(TaskContext);
}
