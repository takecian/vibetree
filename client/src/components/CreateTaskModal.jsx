import React, { useState } from 'react';
import styles from './RepoModal.module.css'; // Reusing similar modal styles or create new ones? Let's use the same structure but maybe new file for cleanliness or just reuse classnames if possible.
// Actually, let's create a dedicated style file to avoid coupling, even if similar.
import modalStyles from './CreateTaskModal.module.css';

export function CreateTaskModal({ onClose, onCreate }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (title.trim()) {
            onCreate(title.trim(), description.trim());
            onClose();
        }
    };

    return (
        <div className={modalStyles.overlay}>
            <div className={modalStyles.modal}>
                <h2>Create New Task</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task Title"
                        className={modalStyles.input}
                        autoFocus
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Task Description (optional)"
                        className={modalStyles.textarea}
                        rows={4}
                    />
                    <div className={modalStyles.actions}>
                        <button type="button" onClick={onClose} className={modalStyles.cancelButton}>
                            Cancel
                        </button>
                        <button type="submit" className={modalStyles.createButton}>
                            Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
