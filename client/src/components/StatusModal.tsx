import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleAlert, CircleCheck } from 'lucide-react';

interface StatusModalProps {
    onClose: () => void;
    title: string;
    message: string;
    tone: 'success' | 'error';
}

export function StatusModal({ onClose, title, message, tone }: StatusModalProps) {
    const { t } = useTranslation();
    const isSuccess = tone === 'success';

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
            <div
                className="bg-slate-800 p-8 rounded-xl w-full max-w-[440px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="status-dialog-title"
            >
                <div className="flex items-start gap-4 mb-6">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isSuccess ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {isSuccess ? (
                            <CircleCheck size={24} className="text-green-500" />
                        ) : (
                            <CircleAlert size={24} className="text-red-500" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h2 id="status-dialog-title" className="mt-0 mb-2 text-slate-50 text-lg">{title}</h2>
                        <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-700 text-slate-100 border border-slate-600 rounded-md font-medium cursor-pointer hover:bg-slate-600"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
