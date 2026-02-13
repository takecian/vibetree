import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTasks } from '../context/TaskContext';
import { useNavigate } from 'react-router-dom';
import { RepoModal } from './RepoModal';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetail } from './TaskDetail';
import { Plus, Github, Folder, Settings } from 'lucide-react';
import { Task, AppConfig } from '../types'; // Import Task and AppConfig interfaces

interface Columns {
    todo: string;
    inprogress: string;
    inreview: string;
    done: string;
    cancelled: string;
}

const COLUMNS: Columns = {
    todo: 'To Do',
    inprogress: 'In Progress',
    inreview: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled'
};

export function KanbanBoard() {
    const { tasks, moveTask, addTask, isConnected, config, setRepoPath, loading } = useTasks();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    if (loading) {
        return <div className="flex justify-center items-center h-screen text-xl text-slate-400 bg-slate-900">Loading...</div>;
    }

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId !== destination.droppableId) {
            moveTask(draggableId, destination.droppableId as Task['status']);
        }
    };

    const handleCreateTask = async (title: string, description: string) => {
        await addTask(title, description);
    };

    // Extract repo name from path
    const repoName: string = config?.repoPath ? config.repoPath.split('/').pop() || 'No Repository' : 'No Repository';

    const handleSaveConfig = async (path: string, aiTool: string) => {
        await setRepoPath(path, aiTool);
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

            {selectedTaskId && (
                <TaskDetail
                    taskId={selectedTaskId}
                    onClose={() => setSelectedTaskId(null)}
                />
            )}

            <header className="px-6 py-4 border-b border-slate-600 flex justify-between items-center bg-slate-800">
                <div className="flex items-center gap-4">
                    <h1 className="m-0 text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Vibe-Flow</h1>
                    {isConnected && (
                        <div className="flex items-center gap-1.5 bg-slate-600 text-slate-400 px-2.5 py-1 rounded-full text-sm font-medium border border-slate-600">
                            <Folder size={14} />
                            <span>{repoName}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowSettings(true)} 
                        className="bg-transparent border-0 cursor-pointer text-slate-400 p-2 rounded-md flex items-center justify-center transition-all hover:bg-slate-600 hover:text-slate-50" 
                        title="Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="flex items-center gap-1.5 bg-blue-500 text-white border-0 px-4 py-2 rounded-md font-medium cursor-pointer transition-colors hover:bg-blue-600 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed" 
                        disabled={!isConnected}
                    >
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </header>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-1 overflow-x-auto p-6 gap-6">
                    {Object.entries(COLUMNS).map(([columnId, title]) => (
                        <Droppable key={columnId} droppableId={columnId}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="flex-1 min-w-[300px] bg-slate-800 rounded-xl p-4 flex flex-col"
                                >
                                    <h2 className="m-0 mb-4 text-sm font-semibold text-slate-400 uppercase tracking-wider">{title}</h2>
                                    <div className="flex-1 overflow-y-auto flex flex-col gap-3">
                                        {tasks.filter(t => t.status === columnId).map((task: Task, index: number) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="bg-slate-600 rounded-lg p-3 cursor-grab transition-all border border-slate-600 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-500"
                                                        onClick={() => setSelectedTaskId(task.id)}
                                                    >
                                                        <div>
                                                            <span className="font-medium block mb-2">{task.title}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs text-slate-400">
                                                            <span>#{task.id.slice(0, 4)}</span>
                                                            {task.branchName && <div className="flex items-center gap-1 bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded"><Github size={12} /> {task.branchName}</div>}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
