import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks } from '../context/TaskContext';
import { RepoModal } from './RepoModal';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetail } from './TaskDetail';
import { Plus, Github, Folder, Settings } from 'lucide-react';
import { Task, AppConfig } from '../types'; // Import Task and AppConfig interfaces


export function KanbanBoard() {
    // We no longer need moveTask or onDragEnd for the board layout
    const { t } = useTranslation();
    const { tasks, addTask, isConnected, config, setRepoPath } = useTasks();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    // Default to the first in-progress task or the first task if none selected
    React.useEffect(() => {
        if (!selectedTaskId && tasks.length > 0) {
            setSelectedTaskId(tasks[0].id);
        }
    }, [tasks, selectedTaskId]);

    const handleCreateTask = async (title: string, description: string) => {
        await addTask(title, description);
    };

    // Extract repo name from path (handle trailing slash and Windows backslashes)
    const repoName: string = (() => {
        if (!config?.repoPath || !config.repoPath.trim()) return t('common.noRepository');
        const normalized = config.repoPath.replace(/[/\\]+$/, '');
        const segment = normalized.split(/[/\\]/).filter(Boolean).pop();
        return segment || normalized || t('common.noRepository');
    })();

    const handleSaveConfig = async (path: string, aiTool: string, copyFiles: string) => {
        await setRepoPath(path, aiTool, copyFiles);
        setShowSettings(false);
    };

    return (
        <div className="h-screen flex flex-col bg-slate-900 text-slate-50 relative overflow-hidden">
            {/* Show modal if NOT connected (forced) OR if settings explicitly open (optional) */}
            {(!isConnected || showSettings) && (
                <RepoModal
                    onSave={handleSaveConfig}
                    initialConfig={config as AppConfig | null} // Cast to AppConfig | null
                    onClose={isConnected ? () => setShowSettings(false) : undefined}
                />
            )}

            {isCreateModalOpen && (
                <CreateTaskModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateTask}
                />
            )}

            <header className="px-6 py-4 border-b border-slate-600 flex justify-between items-center bg-slate-800 shadow-lg z-10">
                <div className="flex items-center gap-4">
                    <h1 className="m-0 text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">{t('app.title')}</h1>
                    {(isConnected || (config?.repoPath && config.repoPath.trim())) && (
                        <div className="flex items-center gap-1.5 bg-slate-700/50 text-slate-400 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-600">
                            <Folder size={12} />
                            <span>{repoName}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="bg-transparent border-0 cursor-pointer text-slate-400 p-2 rounded-md flex items-center justify-center transition-all hover:bg-slate-700 hover:text-slate-50"
                        title={t('common.settings')}
                    >
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-1.5 bg-blue-600 text-white border-0 px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed shadow-sm"
                        disabled={!isConnected}
                    >
                        <Plus size={14} /> {t('header.newTask')}
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Task List Sidebar */}
                <div className="w-80 flex flex-col border-r border-slate-700 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('taskList.title')} ({tasks.length})</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                        {tasks.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                {t('taskList.empty')}
                            </div>
                        ) : (
                            tasks.map((task: Task) => (
                                <div
                                    key={task.id}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedTaskId === task.id
                                        ? 'bg-blue-500/10 border-blue-500/30'
                                        : 'bg-transparent border-transparent hover:bg-slate-700/30 hover:border-slate-600/30'
                                        }`}
                                    onClick={() => setSelectedTaskId(task.id)}
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className={`font-medium text-sm leading-snug ${selectedTaskId === task.id ? 'text-blue-400' : 'text-slate-200'}`}>
                                                {task.title}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                            <span>{task.id.slice(0, 8)}</span>
                                            {task.branchName && (
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Github size={10} />
                                                    <span className="truncate max-w-[120px] font-sans italic">{task.branchName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
                    {selectedTaskId ? (
                        <TaskDetail key={selectedTaskId} taskId={selectedTaskId} />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-700/50 backdrop-blur-sm grayscale opacity-50">
                                <Plus size={32} className="text-slate-600" />
                            </div>
                            <h2 className="text-xl font-light text-slate-400 mb-2">Select a Task</h2>
                            <p className="max-w-xs text-sm text-slate-600 leading-relaxed font-light">Select a task from the sidebar to view details, open the terminal, and use AI features.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
