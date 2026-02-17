import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CreateTaskModalProps {
    onClose: () => void;
    onCreate: (title: string, description: string) => void;
    isCreating: boolean;
}

export function CreateTaskModal({ onClose, onCreate, isCreating }: CreateTaskModalProps) {
    const { t } = useTranslation();
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (title.trim() && !isCreating) {
            onCreate(title.trim(), description.trim());
        }
    };

    const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
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
            <div className="bg-slate-800 p-8 rounded-xl w-full max-w-[400px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]" onClick={(e) => e.stopPropagation()}>
                <h2 className="mt-0 mb-6 text-slate-50 text-lg">{t('createTask.title')}</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder={t('createTask.titlePlaceholder')}
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base mb-6 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        autoFocus
                        disabled={isCreating}
                    />
                    <textarea
                        value={description}
                        onChange={handleDescriptionChange}
                        placeholder={t('createTask.descriptionPlaceholder')}
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-sm mb-6 resize-y font-[inherit] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        rows={4}
                        disabled={isCreating}
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} disabled={isCreating} className="px-5 py-2.5 bg-transparent text-slate-400 border border-slate-600 rounded-md font-medium cursor-pointer hover:bg-slate-600 hover:text-slate-50 disabled:opacity-50">
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="px-5 py-2.5 bg-blue-500 text-white border-0 rounded-md font-medium cursor-pointer hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    {t('common.loading')}...
                                </>
                            ) : (
                                t('createTask.createButton')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
