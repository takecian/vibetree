import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../api/trpc';
import { FolderOpen } from 'lucide-react';
import { AppConfig } from '../types';

interface RepoModalProps {
    onSave: (path: string, aiTool: string, copyFiles: string, worktreePath: string) => void;
    initialConfig: AppConfig | null;
    initialRepository?: { path?: string; copyFiles?: string; worktreePath?: string; aiTool?: string };
    onClose?: () => void;
    hideRepoPath?: boolean;
    hideAiAssistant?: boolean;
    hideCopyFiles?: boolean;
    hideWorktreePath?: boolean;
    allowDefaultAiTool?: boolean;
}

export function RepoModal({ onSave, initialConfig, initialRepository, onClose, hideRepoPath, hideAiAssistant, hideCopyFiles, hideWorktreePath, allowDefaultAiTool }: RepoModalProps) {
    const { t } = useTranslation();
    const [path, setPath] = useState<string>('');
    const [aiTool, setAiTool] = useState<string>('claude');
    const [copyFiles, setCopyFiles] = useState<string>('');
    const [worktreePath, setWorktreePath] = useState<string>('');
    const defaultAiTool = initialConfig?.aiTool || 'claude';

    // tRPC Hooks
    const { data: availableTools = {}, isLoading: checkingTools } = trpc.getAiTools.useQuery();
    const pickFolderMutation = trpc.pickFolder.useMutation();

    useEffect(() => {
        if (initialRepository?.path !== undefined) setPath(initialRepository.path ?? '');
        if (allowDefaultAiTool && initialRepository) {
            setAiTool(initialRepository.aiTool ?? '');
        } else if (initialConfig?.aiTool) {
            setAiTool(initialConfig.aiTool);
        }
        if (initialRepository?.copyFiles !== undefined) setCopyFiles(initialRepository.copyFiles ?? '');
        if (initialRepository?.worktreePath !== undefined) setWorktreePath(initialRepository.worktreePath ?? '');
    }, [initialConfig, initialRepository, allowDefaultAiTool]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(path.trim(), aiTool, copyFiles.trim(), worktreePath.trim());
    };

    const handleBrowse = async () => {
        try {
            const result = await pickFolderMutation.mutateAsync();
            if ('path' in result && result.path) {
                setPath(result.path);
            }
        } catch (e) {
            console.error(e);
            alert(t('repoModal.folderPickerError'));
        }
    };

    const handlePathChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPath(e.target.value);
    };

    const handleAiToolChange = (tool: string) => {
        if (allowDefaultAiTool && tool === defaultAiTool) {
            // In repository settings, selecting the global default tool means "inherit from global config".
            setAiTool('');
            return;
        }
        setAiTool(tool);
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose?.(); // Call onClose if it exists
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const getToolOptionClasses = (isSelected: boolean, isAvailable: boolean) => {
        const baseClasses = 'flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all relative gap-2';
        if (!isAvailable) {
            return `${baseClasses} border-slate-600 bg-slate-800 opacity-50 cursor-not-allowed`;
        }
        if (isSelected) {
            return `${baseClasses} border-blue-500 bg-blue-500/10`;
        }
        return `${baseClasses} border-slate-600 bg-slate-900`;
    };

    return (
        <div
            className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex justify-center items-center z-[1000] backdrop-blur-sm"
            onClick={onClose ? onClose : undefined}
        >
            <div
                className="bg-slate-800 p-8 rounded-xl w-full max-w-[500px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mt-0 text-slate-50">{t('repoModal.title')}</h2>
                <p className="text-slate-400 mb-6">{t('repoModal.subtitle')}</p>
                <form onSubmit={handleSubmit}>
                    {!hideRepoPath && (
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium text-slate-50">{t('repoModal.repoPath')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={path}
                                    onChange={handlePathChange}
                                    placeholder={t('repoModal.repoPathPlaceholder')}
                                    className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={handleBrowse}
                                    className="px-4 bg-slate-600 text-slate-50 border border-slate-600 rounded-md cursor-pointer flex items-center justify-center transition-all hover:bg-slate-900 hover:border-blue-500 disabled:opacity-50"
                                    title={t('repoModal.browseFolderTitle')}
                                    disabled={pickFolderMutation.isPending}
                                >
                                    <FolderOpen size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {!hideAiAssistant && (
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium text-slate-50">{t('repoModal.aiAssistant')}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['claude', 'codex', 'gemini'].map(tool => {
                                    const isAvailable = !!availableTools[tool as keyof typeof availableTools];
                                    const isDefaultTool = allowDefaultAiTool && tool === defaultAiTool;
                                    const isSelected = (allowDefaultAiTool && aiTool === '' && isDefaultTool) || aiTool === tool;
                                    return (
                                        <label key={tool} className={getToolOptionClasses(isSelected, isAvailable)}>
                                            <input
                                                type="radio"
                                                name="aiTool"
                                                value={tool}
                                                checked={isSelected}
                                                onChange={() => handleAiToolChange(tool)}
                                                disabled={!isAvailable}
                                                className="hidden"
                                            />
                                            <span className="font-medium capitalize">
                                                {tool}
                                                {isDefaultTool ? ` ${t('repoModal.defaultSuffix')}` : ''}
                                            </span>
                                            {isAvailable ? <span className="text-green-500 text-[10px]">●</span> : <span className="text-slate-400 text-[10px]">○</span>}
                                        </label>
                                    );
                                })}
                            </div>
                            {checkingTools && <span className="text-xs text-slate-400 mt-2 block">{t('repoModal.checkingTools')}</span>}
                        </div>
                    )}

                    {!hideCopyFiles && (
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium text-slate-50">{t('repoModal.copyFiles')}</label>
                            <textarea
                                value={copyFiles}
                                onChange={(e) => setCopyFiles(e.target.value)}
                                placeholder={t('repoModal.copyFilesPlaceholder')}
                                rows={3}
                                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
                            />
                            <p className="text-xs text-slate-400 mt-1">{t('repoModal.copyFilesHelp')}</p>
                        </div>
                    )}

                    {!hideWorktreePath && (
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium text-slate-50">{t('repoModal.worktreePath')}</label>
                            <input
                                type="text"
                                value={worktreePath}
                                onChange={(e) => setWorktreePath(e.target.value)}
                                placeholder={t('repoModal.worktreePathPlaceholder')}
                                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-1">{t('repoModal.worktreePathHelp')}</p>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        {onClose && (
                            <button type="button" onClick={onClose} className="flex-1 p-3 bg-transparent text-slate-400 border border-slate-600 rounded-md text-base font-medium cursor-pointer transition-all hover:bg-slate-600 hover:text-slate-50">
                                {t('common.cancel')}
                            </button>
                        )}
                        <button type="submit" className="w-full p-3 bg-blue-500 text-white border-0 rounded-md text-base font-medium cursor-pointer transition-opacity hover:bg-blue-600 disabled:opacity-70 disabled:cursor-not-allowed" disabled={pickFolderMutation.isPending || (!hideRepoPath && !path)}>
                            {t('repoModal.saveConfiguration')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
