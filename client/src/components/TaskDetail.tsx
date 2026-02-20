import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { TerminalView } from './TerminalView';
import { DiffView } from './DiffView';
import { X, FileText, Terminal, MoreVertical, Trash2, GitBranch, Folder, ClipboardCopy, GitPullRequest, RefreshCw, Code } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';
import { CreatePRModal } from './CreatePRModal';
import { ForcePushModal } from './ForcePushModal';
import { useTerminals } from '../context/TerminalContext';
import { Task } from '../types';
import { trpc } from '../api/trpc';

interface TaskDetailProps {
    taskId: string;
    repoPath: string;
    onClose?: () => void;
    onTaskSelect?: (taskId: string | null) => void;
}

export function TaskDetail({ taskId, repoPath, onClose, onTaskSelect }: TaskDetailProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const menuRef = useRef<HTMLDivElement>(null);
    const { addTask, deleteTask } = useTasks();
    const { destroyTerminalSession } = useTerminals();

    // Constants
    const PR_CHECK_STALE_TIME_MS = 60000; // 1 minute

    // Resolve ID from props
    const effectiveId = taskId;
    const { data: tasks = [] } = trpc.getTasks.useQuery({ repoPath });
    const task: Task | undefined = tasks.find(t => t.id === effectiveId);
    const [activeTab, setActiveTab] = useState<'terminal' | 'details' | 'diff'>('terminal');
    const [showOptionsMenu, setShowOptionsMenu] = useState<boolean>(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
    const [isCreatePRModalOpen, setCreatePRModalOpen] = useState<boolean>(false);
    const [isRebaseModalOpen, setRebaseModalOpen] = useState<boolean>(false);
    const [isForcePushModalOpen, setForcePushModalOpen] = useState<boolean>(false);

    // tRPC Queries
    const { data: diffData, isLoading: loadingDiff } = trpc.getGitDiff.useQuery(
        { repoPath, taskId: effectiveId },
        { enabled: activeTab === 'diff' && !!effectiveId }
    );
    const { data: worktree } = trpc.getWorktreePath.useQuery(
        { repoPath, taskId: effectiveId },
        { enabled: !!effectiveId }
    );
    const { data: vsCodeCheck } = trpc.checkVSCode.useQuery();
    const { data: prCheckData } = trpc.hasChangesForPR.useQuery(
        { repoPath, taskId: effectiveId },
        { 
            enabled: !task?.prUrl && !!effectiveId,
            refetchOnWindowFocus: false,
            staleTime: PR_CHECK_STALE_TIME_MS
        }
    );
    const openDirectory = trpc.openDirectory.useMutation();
    const openVSCode = trpc.openVSCode.useMutation();
    const createPRMutation = trpc.createPR.useMutation();
    const pushMutation = trpc.push.useMutation();
    const forcePushMutation = trpc.forcePush.useMutation();
    const syncPRWithAI = trpc.syncPRWithAI.useMutation();
    const rebaseMutation = trpc.rebase.useMutation();
    const checkPRMergeStatusMutation = trpc.checkPRMergeStatus.useMutation();
    const utils = trpc.useUtils();

    // Automatically check PR merge status in the background (non-blocking)
    useEffect(() => {
        if (task?.prUrl && !task.prMerged) {
            // Use setTimeout to ensure this doesn't block the initial render
            const timer = setTimeout(() => {
                checkPRMergeStatusMutation.mutate(
                    { repoPath, taskId: effectiveId },
                    {
                        onSuccess: (data) => {
                            if (data.merged) {
                                // Invalidate tasks to refresh the UI with updated merge status
                                utils.getTasks.invalidate();
                            }
                        },
                    }
                );
            }, 500); // Small delay to let UI render first

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task?.prUrl, task?.prMerged, effectiveId, repoPath]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowOptionsMenu(false);
            }
        };

        if (showOptionsMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showOptionsMenu]);

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

    const handleDuplicate = async () => {
        setShowOptionsMenu(false);
        try {
            const duplicatedTask = await addTask(repoPath, task.title, task.description || '');
            onTaskSelect?.(duplicatedTask.id);
        } catch (e) {
            console.error('Failed to duplicate task', e);
            alert(t('taskDetail.duplicateError'));
        }
    };

    const handleConfirmDelete = async () => {
        if (task) {
            destroyTerminalSession(task.id);
            await deleteTask(repoPath, task.id);
            setDeleteModalOpen(false);
            if (onClose) {
                onClose(); // Close side panel
            } else {
                navigate('/'); // Navigate to main board
            }
        }
    };

    const handleOpenWorktree = () => {
        if (worktree?.path) {
            openDirectory.mutate({ path: worktree.path });
        }
    };

    const handleOpenVSCode = () => {
        if (worktree?.path) {
            openVSCode.mutate({ path: worktree.path });
        }
    };

    const handleCopyWorktreePath = async () => {
        if (worktree?.path) {
            try {
                await navigator.clipboard.writeText(worktree.path);
                // Optionally, add a visual feedback like a toast notification
                console.log('Worktree path copied to clipboard:', worktree.path);
            } catch (err) {
                console.error('Failed to copy worktree path:', err);
            }
        }
    };

    const handleRebase = () => {
        setShowOptionsMenu(false);
        setRebaseModalOpen(true);
    };

    const handleConfirmRebase = async () => {
        try {
            const defaultBranch = await utils.getDefaultBranch.fetch({ repoPath });
            await rebaseMutation.mutateAsync({ repoPath, taskId: effectiveId, baseBranch: defaultBranch });
            setRebaseModalOpen(false);
            // Refresh diff after rebase
            utils.getGitDiff.invalidate({ repoPath, taskId: effectiveId });
            utils.hasChangesForPR.invalidate({ repoPath, taskId: effectiveId });
        } catch (e) {
            console.error('Rebase failed', e);
        }
    };

    const handlePush = async () => {
        setShowOptionsMenu(false);
        try {
            await pushMutation.mutateAsync({
                repoPath,
                taskId: effectiveId,
                commitMessage: task.title
            });

            // Automatically sync PR summary using AI
            try {
                await syncPRWithAI.mutateAsync({ repoPath, taskId: effectiveId });
            } catch (aiErr) {
                console.warn('AI PR Sync failed', aiErr);
                // Don't fail the whole push if AI fails
            }

            // Refresh diff and status after push
            utils.getGitStatus.invalidate({ repoPath, taskId: effectiveId });
            utils.getGitDiff.invalidate({ repoPath, taskId: effectiveId });
            utils.hasChangesForPR.invalidate({ repoPath, taskId: effectiveId });
            utils.getTasks.invalidate({ repoPath });
        } catch (e: any) {
            console.error('Push failed', e);
            // Check if push was rejected due to remote changes using error code
            if (e?.code === 'PUSH_REJECTED_REMOTE_CHANGES') {
                setForcePushModalOpen(true);
            } else {
                alert(t('taskDetail.pushError'));
            }
        }
    };

    const handleConfirmForcePush = async () => {
        try {
            await forcePushMutation.mutateAsync({
                repoPath,
                taskId: effectiveId,
                commitMessage: task.title
            });

            // Automatically sync PR summary using AI
            try {
                await syncPRWithAI.mutateAsync({ repoPath, taskId: effectiveId });
            } catch (aiErr) {
                console.warn('AI PR Sync failed', aiErr);
            }

            // Refresh diff and status after push
            utils.getGitStatus.invalidate({ repoPath, taskId: effectiveId });
            utils.getGitDiff.invalidate({ repoPath, taskId: effectiveId });
            utils.hasChangesForPR.invalidate({ repoPath, taskId: effectiveId });
            utils.getTasks.invalidate({ repoPath });
            
            setForcePushModalOpen(false);
        } catch (e: any) {
            console.error('Force push failed', e);
            alert(t('taskDetail.forcePushError'));
            setForcePushModalOpen(false);
        }
    };

    const handleCreatePR = () => {
        setShowOptionsMenu(false);
        setCreatePRModalOpen(true);
    };

    const handleConfirmCreatePR = async (title: string, body: string, baseBranch: string) => {
        try {
            const result = await createPRMutation.mutateAsync({
                repoPath,
                taskId: effectiveId,
                title,
                body,
                baseBranch
            });
            if (result.success && result.url) {
                window.open(result.url, '_blank');
            }
            // Refresh tasks to get the new prUrl
            await utils.getTasks.invalidate({ repoPath });
            setCreatePRModalOpen(false);
            
            // Automatically check PR merge status after creating PR (non-blocking)
            checkPRMergeStatusMutation.mutate(
                { repoPath, taskId: effectiveId },
                {
                    onSuccess: (data) => {
                        if (data.merged) {
                            utils.getTasks.invalidate();
                        }
                    },
                }
            );
        } catch (e) {
            console.error('Failed to create PR', e);
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
                    {task.prUrl ? (
                        <>
                            <a
                                href={task.prUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-md text-xs font-medium hover:bg-blue-500/20 transition-colors no-underline"
                                title={t('taskDetail.viewPR')}
                            >
                                <GitPullRequest size={12} />
                                PR
                            </a>
                            {task.prMerged && (
                                <>
                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-400 rounded-md text-xs font-medium">
                                        {t('taskDetail.merged')}
                                    </span>
                                    <button
                                        onClick={handleDelete}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors"
                                        title={t('taskDetail.deleteMergedTask')}
                                    >
                                        <Trash2 size={14} />
                                        {t('taskDetail.deleteMergedTask')}
                                    </button>
                                </>
                            )}
                        </>
                    ) : prCheckData?.hasChanges ? (
                        <button
                            onClick={handleCreatePR}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                            disabled={createPRMutation.isPending}
                        >
                            <GitPullRequest size={14} className={createPRMutation.isPending ? 'animate-pulse' : ''} />
                            {t('taskDetail.createPR')}
                        </button>
                    ) : null}
                </div>
                <div className="flex gap-3 relative">
                    <button className={getTabButtonClasses(activeTab === 'details')} onClick={() => setActiveTab('details')}>
                        <FileText size={16} /> {t('taskDetail.tabs.details')}
                    </button>
                    <button className={getTabButtonClasses(activeTab === 'terminal')} onClick={() => setActiveTab('terminal')}>
                        <Terminal size={16} /> {t('taskDetail.tabs.terminal')}
                    </button>
                    <button className={getTabButtonClasses(activeTab === 'diff')} onClick={() => setActiveTab('diff')}>
                        <GitBranch size={16} /> {t('taskDetail.tabs.diff')}
                    </button>
                    <div className="relative flex items-center" ref={menuRef}>
                        <button className="bg-transparent border-0 text-slate-400 cursor-pointer p-2 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-slate-50" onClick={() => setShowOptionsMenu(!showOptionsMenu)}>
                            <MoreVertical size={18} />
                        </button>
                        {showOptionsMenu && (
                            <div className="absolute top-full right-0 bg-slate-800 border border-slate-600 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.2)] min-w-[160px] z-10 overflow-hidden mt-2">
                                <button onClick={handleRebase} className="flex items-center gap-2 w-full px-4 py-2.5 bg-transparent border-0 text-slate-50 cursor-pointer text-left text-sm hover:bg-slate-600 border-b border-slate-700">
                                    <RefreshCw size={16} className={rebaseMutation.isPending ? 'animate-spin' : ''} /> {t('taskDetail.rebase')}
                                </button>
                                {task.prUrl && (
                                    <button onClick={handlePush} className="flex items-center gap-2 w-full px-4 py-2.5 bg-transparent border-0 text-slate-50 cursor-pointer text-left text-sm hover:bg-slate-600 border-b border-slate-700">
                                        <GitPullRequest size={16} className={pushMutation.isPending ? 'text-blue-400 animate-pulse' : ''} /> {t('taskDetail.push')}
                                    </button>
                                )}
                                <button onClick={handleDuplicate} className="flex items-center gap-2 w-full px-4 py-2.5 bg-transparent border-0 text-slate-50 cursor-pointer text-left text-sm hover:bg-slate-600 border-b border-slate-700">
                                    <ClipboardCopy size={16} /> {t('taskDetail.duplicate')}
                                </button>
                                <button onClick={handleDelete} className="flex items-center gap-2 w-full px-4 py-2.5 bg-transparent border-0 text-red-400 cursor-pointer text-left text-sm hover:bg-slate-600">
                                    <Trash2 size={16} /> {t('taskDetail.delete')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-0 flex relative">
                <div className={`flex-1 p-6 overflow-y-auto ${activeTab !== 'details' ? 'hidden' : ''}`}>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 max-w-[800px] mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="mt-0 text-base text-slate-400 uppercase tracking-wider">{t('taskDetail.description')}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleOpenWorktree}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-50 rounded-md text-sm hover:bg-slate-600 transition-colors"
                                >
                                    <Folder size={16} />
                                    {t('taskDetail.openInFinder')}
                                </button>
                                {vsCodeCheck?.installed && (
                                    <button
                                        onClick={handleOpenVSCode}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-50 rounded-md text-sm hover:bg-slate-600 transition-colors"
                                    >
                                        <Code size={16} />
                                        {t('taskDetail.openInVSCode')}
                                    </button>
                                )}
                                <button
                                    onClick={handleCopyWorktreePath}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-slate-50 rounded-md text-sm hover:bg-slate-600 transition-colors"
                                >
                                    <ClipboardCopy size={16} />
                                    {t('taskDetail.copyPath')}
                                </button>
                            </div>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-50 mb-6">{task.description || 'No description provided.'}</p>

                        {task.prUrl && (
                            <div className="mt-6 pt-6 border-t border-slate-700">
                                <h3 className="mt-0 mb-3 text-sm text-slate-400 uppercase tracking-wider">{t('taskDetail.pullRequest')}</h3>
                                <a
                                    href={task.prUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors no-underline text-sm font-medium"
                                >
                                    <GitPullRequest size={16} />
                                    {task.prUrl}
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`flex-1 bg-black p-0 ${activeTab === 'terminal' ? 'flex' : 'hidden'}`}>
                    <TerminalView taskId={task.id} repoPath={repoPath} />
                </div>

                <div className={`flex-1 p-6 overflow-y-auto bg-slate-900 ${activeTab !== 'diff' ? 'hidden' : ''}`}>
                    {loadingDiff ? (
                        <div className="flex justify-center items-center h-40 text-slate-500">{t('taskDetail.diffLoading')}</div>
                    ) : (
                        <DiffView diffText={diffData?.diff || ''} />
                    )}
                </div>
            </main>

            {isDeleteModalOpen && (
                <ConfirmationModal
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title={t('taskDetail.deleteConfirmation.title')}
                    confirmText={t('taskDetail.deleteConfirmation.confirm')}
                >
                    <p>{t('taskDetail.deleteConfirmation.message', { title: task.title })}</p>
                </ConfirmationModal>
            )}

            {isRebaseModalOpen && (
                <ConfirmationModal
                    onClose={() => setRebaseModalOpen(false)}
                    onConfirm={handleConfirmRebase}
                    title={t('taskDetail.rebaseConfirmation.title')}
                    confirmText={t('taskDetail.rebaseConfirmation.confirm')}
                >
                    <p>{t('taskDetail.rebaseConfirmation.message')}</p>
                </ConfirmationModal>
            )}

            {isCreatePRModalOpen && (
                <CreatePRModal
                    repoPath={repoPath}
                    initialTitle={task.title}
                    initialDescription={task.description}
                    isCreating={createPRMutation.isPending}
                    onClose={() => setCreatePRModalOpen(false)}
                    onCreate={handleConfirmCreatePR}
                />
            )}

            {isForcePushModalOpen && (
                <ForcePushModal
                    onClose={() => setForcePushModalOpen(false)}
                    onConfirm={handleConfirmForcePush}
                    isLoading={forcePushMutation.isPending}
                />
            )}
        </div>
    );
}
