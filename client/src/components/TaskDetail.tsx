import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { TerminalView } from './TerminalView';
import { X, FileText, Terminal, MoreVertical, Trash2, GitBranch } from 'lucide-react';
import { getGitDiff } from '../api';
import { ConfirmationModal } from './ConfirmationModal';
import { useTerminals } from '../context/TerminalContext';
import { Task } from '../types';

interface TaskDetailProps {
    taskId?: string;
    onClose?: () => void;
}

export function TaskDetail({ taskId, onClose }: TaskDetailProps) {
    const { id } = useParams<string>();
    const navigate = useNavigate();
    const { tasks, deleteTask } = useTasks();
    const { getTerminalSession, destroyTerminalSession } = useTerminals();

    // Resolve ID from props (side panel) or params (route)
    const effectiveId = taskId || id;
    const task: Task | undefined = tasks.find(t => t.id === effectiveId);
    const [activeTab, setActiveTab] = useState<'terminal' | 'details' | 'diff'>('terminal');
    const [diff, setDiff] = useState<string>('');
    const [loadingDiff, setLoadingDiff] = useState<boolean>(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

    useEffect(() => {
        if (activeTab === 'diff' && task) {
            const fetchDiff = async () => {
                setLoadingDiff(true);
                try {
                    const data = await getGitDiff(task.id);
                    setDiff(data.diff || 'No changes found.');
                } catch (e) {
                    setDiff('Error fetching diff.');
                } finally {
                    setLoadingDiff(false);
                }
            };
            fetchDiff();
        }
    }, [activeTab, task?.id]);

    if (!task) return null; // Don't show loading in sidebar, just null if not found


    const containerClasses = onClose
        ? 'h-screen flex flex-col bg-slate-900 fixed top-0 right-0 bottom-0 w-1/2 min-w-[600px] z-[1000] shadow-[-4px_0_20px_rgba(0,0,0,0.5)] border-l border-slate-600'
        : 'flex-1 flex flex-col bg-slate-900 overflow-hidden';

    const getTabButtonClasses = (isActive: boolean) => {
        const baseClasses = 'px-3 py-1.5 text-sm border-0 rounded-md cursor-pointer flex items-center gap-1.5 transition-colors';
        return isActive
            ? `${baseClasses} bg-blue-500 text-white`
            : `${baseClasses} bg-transparent text-slate-400 hover:bg-slate-600 hover:text-slate-50`;
    };

    const handleDelete = () => {
        setShowOptionsMenu(false);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (task) {
            destroyTerminalSession(task.id);
            await deleteTask(task.id);
            setDeleteModalOpen(false);
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
                {onClose && (
                    <button className="bg-transparent border-0 text-slate-400 cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-slate-50" onClick={onClose}>
                        <X size={18} />
                    </button>
                )}
                <div className="flex-1 flex items-center gap-3">
                    <h1 className="m-0 text-lg font-semibold">{task.title}</h1>
                </div>
                <div className="flex gap-3 relative">
                    <button className={getTabButtonClasses(activeTab === 'details')} onClick={() => setActiveTab('details')}>
                        <FileText size={16} /> Details
                    </button>
                    <button className={getTabButtonClasses(activeTab === 'terminal')} onClick={() => setActiveTab('terminal')}>
                        <Terminal size={16} /> Terminal
                    </button>
                    <button className={getTabButtonClasses(activeTab === 'diff')} onClick={() => setActiveTab('diff')}>
                        <GitBranch size={16} /> Diff
                    </button>
                    <div className="relative flex items-center">
                        <button className="bg-transparent border-0 text-slate-400 cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-slate-50" onClick={() => setShowOptionsMenu(!showOptionsMenu)}>
                            <MoreVertical size={18} />
                        </button>
                        {showOptionsMenu && (
                            <div className="absolute top-full right-0 bg-slate-800 border border-slate-600 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.2)] min-w-[120px] z-10 overflow-hidden mt-2">
                                <button onClick={handleDelete} className="flex items-center gap-2 w-full px-4 py-2.5 bg-transparent border-0 text-slate-50 cursor-pointer text-left text-sm hover:bg-slate-600">
                                                                     <Trash2 size={16} /> Delete
                                                                 </button>
                                                             </div>
                                                         )}
                                                     </div>
                                                 </div>
                                             </header>
                                 
                                             <main className="flex-1 overflow-hidden p-0 flex relative">
                                                 <div className={`flex-1 p-6 overflow-y-auto ${activeTab !== 'details' ? 'hidden' : ''}`}>
                                                     <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 max-w-[800px] mx-auto">
                                                         <h3 className="mt-0 mb-4 text-base text-slate-400 uppercase tracking-wider">Description</h3>
                                                         <p className="whitespace-pre-wrap leading-relaxed text-slate-50">{task.description || 'No description provided.'}</p>
                                                     </div>
                                                 </div>
                                 
                                                 <div className={`flex-1 bg-black p-0 ${activeTab === 'terminal' ? 'flex' : 'hidden'}`}>
                                                     <TerminalView taskId={task.id} />
                                                 </div>
                                 
                                                 <div className={`flex-1 p-6 overflow-y-auto bg-slate-900 ${activeTab !== 'diff' ? 'hidden' : ''}`}>
                                                     {loadingDiff ? (
                                                         <div className="flex justify-center items-center h-40 text-slate-500">Loading diff...</div>
                                                     ) : (
                                                         <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto">
                                                             <pre className="text-slate-300 whitespace-pre font-mono">
                                                                 {diff || 'No changes to show.'}
                                                             </pre>
                                                         </div>
                                                     )}
                                                 </div>
                                             </main>
                                 
                                                         {isDeleteModalOpen && (
                                                             <ConfirmationModal
                                                                 onClose={() => setDeleteModalOpen(false)}
                                                                 onConfirm={handleConfirmDelete}
                                                                 title="Delete Task"
                                                                 confirmText="Delete"
                                                             >
                                                                 <p>Are you sure you want to delete the task "{task.title}"?</p>
                                                                 <p className="text-sm text-slate-400 mt-4">This will also remove any associated terminal sessions. This action cannot be undone.</p>
                                                             </ConfirmationModal>
                                                         )}
                                                     </div>
                                                 );
                                             }                                 
