import React, { useState, useEffect } from 'react';
import styles from './RepoModal.module.css';
import { pickFolder, checkAITools, updateConfig } from '../api';
import { FolderOpen, Cpu } from 'lucide-react';

export function RepoModal({ onSave, initialConfig, onClose }) {
    const [path, setPath] = useState('');
    const [aiTool, setAiTool] = useState('claude');
    const [availableTools, setAvailableTools] = useState({});
    const [loading, setLoading] = useState(false);
    const [checkingTools, setCheckingTools] = useState(true);

    useEffect(() => {
        if (initialConfig?.repoPath) setPath(initialConfig.repoPath);
        if (initialConfig?.aiTool) setAiTool(initialConfig.aiTool);

        async function check() {
            try {
                const tools = await checkAITools();
                console.log('Available AI Tools:', tools);
                setAvailableTools(tools);
                setCheckingTools(false);
            } catch (e) {
                console.error('Failed to check AI tools', e);
            } finally {
                setCheckingTools(false);
            }
        }
        check();
    }, [initialConfig]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (path.trim()) {
            onSave(path.trim(), aiTool);
        }
    };

    const handleBrowse = async () => {
        setLoading(true);
        try {
            const result = await pickFolder();
            if (result.path) {
                setPath(result.path);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to open folder picker. Please paste the path manually.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h2>Configuration</h2>
                <p>Setup your repository and AI assistant.</p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.fieldGroup}>
                        <label>Repository Path</label>
                        <div className={styles.inputGroup}>
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                placeholder="/Users/username/projects/my-repo"
                                className={styles.input}
                                autoFocus
                            />
                            <button type="button" onClick={handleBrowse} className={styles.iconButton} title="Browse Folder">
                                <FolderOpen size={20} />
                            </button>
                        </div>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label>AI Assistant</label>
                        <div className={styles.toolGrid}>
                            {['claude', 'codex', 'gemini'].map(tool => (
                                <label key={tool} className={`${styles.toolOption} ${aiTool === tool ? styles.selected : ''} ${!availableTools[tool] ? styles.disabled : ''}`}>
                                    <input
                                        type="radio"
                                        name="aiTool"
                                        value={tool}
                                        checked={aiTool === tool}
                                        onChange={(e) => setAiTool(e.target.value)}
                                        disabled={!availableTools[tool]}
                                    />
                                    <span className={styles.toolName}>{tool}</span>
                                    {availableTools[tool] ? <span className={styles.statusAvailable}>●</span> : <span className={styles.statusUnavailable}>○</span>}
                                </label>
                            ))}
                        </div>
                        {checkingTools && <span className={styles.checking}>Checking tools...</span>}
                    </div>

                    <div className={styles.buttonGroup}>
                        {onClose && (
                            <button type="button" onClick={onClose} className={styles.cancelButton}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" className={styles.button} disabled={loading || !path}>
                            Save Configuration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
