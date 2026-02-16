import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks } from '../context/TaskContext';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetail } from './TaskDetail';
import { Plus, Github, Settings, RefreshCw } from 'lucide-react';
import { Task } from '../types';
import { trpc } from '../api/trpc';
import { RepoModal } from './RepoModal';

interface TaskBoardProps {
    repoPath: string;
}

export function TaskBoard({ repoPath }: TaskBoardProps) {
    const { t } = useTranslation();
    const { addTask, repositories, updateRepository } = useTasks();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isRepoSettingsOpen, setIsRepoSettingsOpen] = useState<boolean>(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isPulling, setIsPulling] = useState<boolean>(false);

    // Fetch tasks for this specific repo
    const { data: tasks = [], isLoading: tasksLoading } = trpc.getTasks.useQuery({ repoPath });

    const pullMainBranchMutation = trpc.pullMainBranch.useMutation();

    const currentRepo = repositories.find(r => r.path === repoPath);

    // Default to the first task if none selected
    useEffect(() => {
        if (!selectedTaskId && tasks.length > 0) {
            setSelectedTaskId(tasks[0].id);
        }
    }, [tasks, selectedTaskId]);

    const handleCreateTask = async (title: string, description: string) => {
        const newTask = await addTask(repoPath, title, description);
        setSelectedTaskId(newTask.id);
    };

    const handleUpdateRepo = async (path: string, _aiTool: string, copyFiles: string) => {
        if (currentRepo) {
            await updateRepository(currentRepo.id, { path, copyFiles });
            setIsRepoSettingsOpen(false);
        }
    };

    const handlePullMainBranch = async () => {
        setIsPulling(true);
        try {
            await pullMainBranchMutation.mutateAsync({ repoPath });
            alert(t('taskList.pullSuccess'));
        } catch (error) {
            console.error('Pull failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`${t('taskList.pullError')}: ${errorMessage}`);
        } finally {
            setIsPulling(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-900 text-slate-50 relative overflow-hidden">
            {isCreateModalOpen && (
                <CreateTaskModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateTask}
                />
            )}

            {isRepoSettingsOpen && currentRepo && (
                <RepoModal
                    onSave={handleUpdateRepo}
                    initialConfig={{ ...currentRepo, repoPath: currentRepo.path, aiTool: '' }}
                    onClose={() => setIsRepoSettingsOpen(false)}
                    hideAiAssistant={true}
                />
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* Task List Sidebar */}
                <div className="w-80 flex flex-col border-r border-slate-700 bg-slate-800/40 backdrop-blur-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('taskList.title')} ({tasks.length})</span>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePullMainBranch}
                                disabled={isPulling}
                                className="bg-green-600/20 text-green-400 border border-green-500/30 p-1.5 rounded-md hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={t('taskList.pullMainBranch')}
                            >
                                <RefreshCw size={14} className={isPulling ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={() => setIsRepoSettingsOpen(true)}
                                className="bg-slate-700/40 text-slate-400 border border-slate-600/50 p-1.5 rounded-md hover:bg-slate-700 hover:text-slate-200 transition-colors"
                                title="Repository Settings"
                            >
                                <Settings size={14} />
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-blue-600/20 text-blue-400 border border-blue-500/30 p-1.5 rounded-md hover:bg-blue-600/30 transition-colors"
                                title={t('taskList.addTask')}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                        {tasksLoading ? (
                            <div className="p-8 text-center text-slate-500 text-sm italic">Loading tasks...</div>
                        ) : tasks.length === 0 ? (
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
                        <TaskDetail key={selectedTaskId} taskId={selectedTaskId} repoPath={repoPath} />
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
