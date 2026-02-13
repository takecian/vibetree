import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { TerminalView } from './TerminalView';
import { X, FileText, ArrowLeft, Terminal, MoreVertical, Trash2 } from 'lucide-react';
import { Task } from '../types'; // Import the Task interface

interface TaskDetailProps {
    taskId?: string;
    onClose?: () => void;
}

interface TaskParams {
    id: string;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
    const { id } = useParams<TaskParams>();
    const navigate = useNavigate();
    const { tasks, deleteTask } = useTasks();

    // Resolve ID from props (side panel) or params (route)
    const effectiveId = taskId || id;
    const task: Task | undefined = tasks.find(t => t.id === effectiveId);
    const [activeTab, setActiveTab] = useState<'terminal' | 'details'>('terminal');
    const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);

    if (!task) return null; // Don't show loading in sidebar, just null if not found

    const getStatusBadgeClasses = (status: string) => {
        const baseClasses = 'text-xs px-2 py-0.5 rounded-xl uppercase font-semibold';
        const statusClasses = {
            todo: 'bg-slate-400 text-slate-900',
            inprogress: 'bg-blue-500 text-white',
            done: 'bg-green-500 text-white',
            inreview: 'bg-yellow-500 text-white',
            cancelled: 'bg-red-500 text-white'
        };
        return `${baseClasses} ${statusClasses[status as keyof typeof statusClasses] || 'bg-slate-400 text-slate-900'}`;
    };

    const containerClasses = onClose 
        ? 'h-screen flex flex-col bg-slate-900 fixed top-0 right-0 bottom-0 w-1/2 min-w-[600px] z-[1000] shadow-[-4px_0_20px_rgba(0,0,0,0.5)] border-l border-slate-600'
        : 'h-screen flex flex-col bg-slate-900';

    const getTabButtonClasses = (isActive: boolean) => {
        const baseClasses = 'px-3 py-1.5 text-sm border-0 rounded-md cursor-pointer flex items-center gap-1.5 transition-colors';
        return isActive 
            ? `${baseClasses} bg-blue-500 text-white`
            : `${baseClasses} bg-transparent text-slate-400 hover:bg-slate-600 hover:text-slate-50`;
    };

    const handleDeleteTask = async () => {
        if (window.confirm(`Are you sure you want to delete task "${task.title}"?`)) {
            await deleteTask(task.id);
            if (onClose) {
                onClose(); // Close side panel
            } else {
                navigate('/'); // Navigate to main board
            }
        }
    };

    return (
        <div className={containerClasses}>
            <header className="px-6 py-4 border-b border-slate-600 flex items-center gap-4 bg-slate-800">
                {onClose ? (
                    <button className="bg-transparent border-0 text-slate-400 cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-slate-50" onClick={onClose}>
                        <X size={18} />
                    </button>
                ) : (
                    <button className="bg-transparent border-0 text-slate-400 cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-slate-50" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div className="flex-1 flex items-center gap-3">
                    <h1 className="m-0 text-lg font-semibold">{task.title}</h1>
                    <span className={getStatusBadgeClasses(task.status)}>{task.status}</span>
                </div>
                <div className="flex gap-3 relative">
                    <button className={getTabButtonClasses(activeTab === 'details')} onClick={() => setActiveTab('details')}>
                        <FileText size={16} /> Details
                    </button>
                    <button className={getTabButtonClasses(activeTab === 'terminal')} onClick={() => setActiveTab('terminal')}>
                        <Terminal size={16} /> Terminal
                    </button>
                    <div className="relative flex items-center">
                        <button className="bg-transparent border-0 text-slate-400 cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-slate-50" onClick={() => setShowOptionsMenu(!showOptionsMenu)}>
                            <MoreVertical size={18} />
                        </button>
                        {showOptionsMenu && (
                            <div className="absolute top-full right-0 bg-slate-800 border border-slate-600 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.2)] min-w-[120px] z-10 overflow-hidden mt-2">
                                <button onClick={handleDeleteTask} className="flex items-center gap-2 w-full px-4 py-2.5 bg-transparent border-0 text-slate-50 cursor-pointer text-left text-sm hover:bg-slate-600">
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-0 flex">
                {activeTab === 'details' && (
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 max-w-[800px] mx-auto">
                            <h3 className="mt-0 mb-4 text-base text-slate-400 uppercase tracking-wider">Description</h3>
                            <p className="whitespace-pre-wrap leading-relaxed text-slate-50">{task.description || 'No description provided.'}</p>
                        </div>
                    </div>
                )}
                {activeTab === 'terminal' && (
                    <div className="flex-1 bg-black p-0">
                        <TerminalView taskId={task.id} />
                    </div>
                )}
            </main>
        </div>
    );
}
