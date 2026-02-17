import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface ForcePushModalProps {
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export function ForcePushModal({ onClose, onConfirm, isLoading = false }: ForcePushModalProps) {
    const { t } = useTranslation();

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isLoading) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose, isLoading]);

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex justify-center items-center z-[1000] backdrop-blur-sm" onClick={!isLoading ? onClose : undefined}>
            <div 
                className="bg-slate-800 p-8 rounded-xl w-full max-w-[500px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]" 
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="force-push-dialog-title"
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} className="text-yellow-500" />
                    </div>
                    <div className="flex-1">
                        <h2 id="force-push-dialog-title" className="mt-0 mb-2 text-slate-50 text-lg">{t('forcePush.title')}</h2>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            {t('forcePush.message')}
                        </p>
                        <p className="text-yellow-400 text-sm leading-relaxed">
                            {t('forcePush.warning')}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="px-5 py-2.5 bg-transparent text-slate-400 border border-slate-600 rounded-md font-medium cursor-pointer hover:bg-slate-600 hover:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('common.cancel')}
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-5 py-2.5 bg-yellow-500 text-slate-900 border-0 rounded-md font-medium cursor-pointer hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading && (
                            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                        )}
                        {t('forcePush.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
