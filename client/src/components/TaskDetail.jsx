import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { TerminalView } from './TerminalView';
import { createWorktree } from '../api';
import styles from './TaskDetail.module.css';
import { ArrowLeft, GitBranch, Play, Terminal, FileText } from 'lucide-react';

export function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { tasks } = useTasks();
    const task = tasks.find(t => t.id === id);
    const [activeTab, setActiveTab] = useState('terminal');

    if (!task) return <div className={styles.loading}>Loading task...</div>;

    const handleCreateWorktree = async () => {
        try {
            await createWorktree(task.id, task.branchName);
            alert('Worktree created! You can now use the terminal.');
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={() => navigate('/')}>
                    <ArrowLeft size={18} />
                </button>
                <div className={styles.titleSection}>
                    <h1>{task.title}</h1>
                    <span className={`${styles.statusBadge} ${styles[task.status]}`}>{task.status}</span>
                </div>
                <div className={styles.actions}>
                    <button className={styles.actionButton} onClick={handleCreateWorktree}>
                        <GitBranch size={16} /> Setup Worktree
                    </button>
                    <button className={`${styles.actionButton} ${activeTab === 'details' ? styles.active : ''}`} onClick={() => setActiveTab('details')}>
                        <FileText size={16} /> Details
                    </button>
                    <button className={`${styles.actionButton} ${activeTab === 'terminal' ? styles.active : ''}`} onClick={() => setActiveTab('terminal')}>
                        <Terminal size={16} /> Terminal
                    </button>
                </div>
            </header>

            <main className={styles.content}>
                {activeTab === 'details' && (
                    <div className={styles.detailsWrapper}>
                        <div className={styles.descriptionCard}>
                            <h3>Description</h3>
                            <p>{task.description || 'No description provided.'}</p>
                        </div>
                    </div>
                )}
                {activeTab === 'terminal' && (
                    <div className={styles.terminalWrapper}>
                        <TerminalView taskId={task.id} />
                    </div>
                )}
            </main>
        </div>
    );
}
