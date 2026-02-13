import React, { useState, FormEvent, ChangeEvent } from 'react';

interface CreateTaskModalProps {
    onClose: () => void;
    onCreate: (title: string, description: string) => void;
}

export function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onCreate(title.trim(), description.trim());
            onClose();
        }
    };

    const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
    };

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex justify-center items-center z-[1000] backdrop-blur-sm">
            <div className="bg-slate-800 p-8 rounded-xl w-full max-w-[400px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
                <h2 className="mt-0 mb-6 text-slate-50 text-lg">Create New Task</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Task Title"
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base mb-6 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    <textarea
                        value={description}
                        onChange={handleDescriptionChange}
                        placeholder="Task Description (optional)"
                        className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-sm mb-6 resize-y font-[inherit] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        rows={4}
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-transparent text-slate-400 border border-slate-600 rounded-md font-medium cursor-pointer hover:bg-slate-600 hover:text-slate-50">
                            Cancel
                        </button>
                        <button type="submit" className="px-5 py-2.5 bg-blue-500 text-white border-0 rounded-md font-medium cursor-pointer hover:bg-blue-600">
                            Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
