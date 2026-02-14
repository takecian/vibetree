import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
    confirmText?: string;
}

export function ConfirmationModal({ onClose, onConfirm, title, children, confirmText = "Confirm" }: ConfirmationModalProps) {
    const { t } = useTranslation();

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex justify-center items-center z-[1000] backdrop-blur-sm">
            <div className="bg-slate-800 p-8 rounded-xl w-full max-w-[400px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
                <h2 className="mt-0 mb-6 text-slate-50 text-lg">{title}</h2>
                <div className="text-slate-300 mb-6">
                    {children}
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-transparent text-slate-400 border border-slate-600 rounded-md font-medium cursor-pointer hover:bg-slate-600 hover:text-slate-50">
                        {t('common.cancel')}
                    </button>
                    <button type="button" onClick={onConfirm} className="px-5 py-2.5 bg-red-500 text-white border-0 rounded-md font-medium cursor-pointer hover:bg-red-600">
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
