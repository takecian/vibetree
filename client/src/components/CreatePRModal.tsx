import { useState, FormEvent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../api/trpc';

interface CreatePRModalProps {
    repoPath: string;
    taskId: string;
    fallbackTitle: string;
    fallbackDescription: string;
    isCreating: boolean;
    onClose: () => void;
    onCreate: (title: string, body: string | undefined, baseBranch: string) => void;
}

export function CreatePRModal({ repoPath, taskId, fallbackTitle, fallbackDescription, isCreating, onClose, onCreate }: CreatePRModalProps) {
    const { t } = useTranslation();
    const [title, setTitle] = useState<string>(fallbackTitle);
    const [body, setBody] = useState<string>(fallbackDescription);
    const [baseBranch, setBaseBranch] = useState<string>('');
    const { data: defaultBranch } = trpc.getDefaultBranch.useQuery({ repoPath }, { refetchOnWindowFocus: false });
    const { data: draft, isLoading: isGeneratingDraft } = trpc.generatePRDraft.useQuery(
        { repoPath, taskId },
        { refetchOnWindowFocus: false, retry: false }
    );

    useEffect(() => {
        if (draft) {
            setTitle(draft.title || fallbackTitle);
            setBody(draft.body || fallbackDescription);
            setBaseBranch(draft.baseBranch);
        }
    }, [draft, fallbackDescription, fallbackTitle]);

    useEffect(() => {
        if (defaultBranch && !baseBranch) {
            setBaseBranch(defaultBranch);
        }
    }, [defaultBranch, baseBranch]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (title.trim() && baseBranch.trim()) {
            const trimmedBody = body.trim();
            onCreate(title.trim(), trimmedBody || undefined, baseBranch.trim());
        }
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex justify-center items-center z-[1000] backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 p-8 rounded-xl w-full max-w-[500px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]" onClick={(e) => e.stopPropagation()}>
                <h2 className="mt-0 mb-6 text-slate-50 text-lg">{t('createPR.title')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">
                            {t('createPR.titleLabel')}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('createPR.titlePlaceholder')}
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            autoFocus
                            disabled={isCreating || isGeneratingDraft}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">
                            {t('createPR.descriptionLabel')}
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={t('createPR.descriptionPlaceholder')}
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-sm resize-y font-[inherit] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            rows={4}
                            disabled={isCreating || isGeneratingDraft}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">
                            {t('createPR.baseBranchLabel')}
                        </label>
                        <input
                            type="text"
                            value={baseBranch}
                            onChange={(e) => setBaseBranch(e.target.value)}
                            placeholder={isGeneratingDraft ? t('createPR.loadingDefaultBranch') : t('createPR.baseBranchPlaceholder')}
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            disabled={isCreating || isGeneratingDraft}
                        />
                    </div>
                    {isGeneratingDraft && (
                        <p className="mb-4 text-sm text-slate-400">{t('createPR.generatingDraft')}</p>
                    )}

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isCreating || isGeneratingDraft} className="px-5 py-2.5 bg-transparent text-slate-400 border border-slate-600 rounded-md font-medium cursor-pointer hover:bg-slate-600 hover:text-slate-50 disabled:opacity-50">
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || !baseBranch.trim() || isCreating || isGeneratingDraft}
                            className="px-5 py-2.5 bg-blue-500 text-white border-0 rounded-md font-medium cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    {t('common.loading')}...
                                </>
                            ) : (
                                t('createPR.createButton')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
