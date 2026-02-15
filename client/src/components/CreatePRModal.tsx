import { useState, FormEvent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../trpc';

interface CreatePRModalProps {
    repoPath: string;
    initialTitle: string;
    initialDescription: string;
    isCreating: boolean;
    onClose: () => void;
    onCreate: (title: string, body: string, baseBranch: string) => void;
}

export function CreatePRModal({ repoPath, initialTitle, initialDescription, isCreating, onClose, onCreate }: CreatePRModalProps) {
    const { t } = useTranslation();
    const [title, setTitle] = useState<string>(initialTitle);
    const [body, setBody] = useState<string>(initialDescription);
    const [baseBranch, setBaseBranch] = useState<string>('');

    // Using simple tRPC query to get default branch
    const { data: defaultBranch, isLoading: loadingDefaultBranch } = trpc.getDefaultBranch.useQuery({ repoPath });

    useEffect(() => {
        if (defaultBranch) {
            setBaseBranch(defaultBranch);
        }
    }, [defaultBranch]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (title.trim() && baseBranch.trim()) {
            onCreate(title.trim(), body.trim(), baseBranch.trim());
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex justify-center items-center z-[1000] backdrop-blur-sm">
            <div className="bg-slate-800 p-8 rounded-xl w-full max-w-[500px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
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
                            disabled={isCreating}
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
                            disabled={isCreating}
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
                            placeholder={loadingDefaultBranch ? t('createPR.loadingDefaultBranch') : t('createPR.baseBranchPlaceholder')}
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            disabled={isCreating}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isCreating} className="px-5 py-2.5 bg-transparent text-slate-400 border border-slate-600 rounded-md font-medium cursor-pointer hover:bg-slate-600 hover:text-slate-50 disabled:opacity-50">
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || !baseBranch.trim() || isCreating}
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
