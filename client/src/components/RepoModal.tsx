import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { pickFolder, checkAITools } from '../api'; // updateConfig is not directly used here
import { FolderOpen } from 'lucide-react';
import { AppConfig, AiToolsCheckResult } from '../types'; // Import AppConfig and AiToolsCheckResult interfaces

interface RepoModalProps {
    onSave: (path: string, aiTool: string, copyFiles: string) => void;
    initialConfig: AppConfig | null;
    onClose?: () => void;
}

export function RepoModal({ onSave, initialConfig, onClose }: RepoModalProps) {
    const [path, setPath] = useState<string>('');
    const [aiTool, setAiTool] = useState<string>('claude');
    const [copyFiles, setCopyFiles] = useState<string>('');
    const [availableTools, setAvailableTools] = useState<AiToolsCheckResult>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [checkingTools, setCheckingTools] = useState<boolean>(true);

    useEffect(() => {
        if (initialConfig?.repoPath) setPath(initialConfig.repoPath);
        if (initialConfig?.aiTool) setAiTool(initialConfig.aiTool);
        if (initialConfig?.copyFiles !== undefined) setCopyFiles(initialConfig.copyFiles ?? '');

        async function check() {
            try {
                const tools: AiToolsCheckResult = await checkAITools();
                console.log('Available AI Tools:', tools);
                setAvailableTools(tools);
            } catch (e) {
                console.error('Failed to check AI tools', e);
            } finally {
                setCheckingTools(false);
            }
        }
        check();
    }, [initialConfig]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (path.trim()) {
            onSave(path.trim(), aiTool, copyFiles.trim());
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

    const handlePathChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPath(e.target.value);
    };

    const handleAiToolChange = (e: ChangeEvent<HTMLInputElement>) => {
        setAiTool(e.target.value);
    };

    const getToolOptionClasses = (tool: string, isSelected: boolean, isAvailable: boolean) => {
        const baseClasses = 'flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all relative gap-2';
        if (!isAvailable) {
            return `${baseClasses} border-slate-600 bg-slate-800 opacity-50 cursor-not-allowed`;
        }
        if (isSelected) {
            return `${baseClasses} border-blue-500 bg-blue-500/10`;
        }
        return `${baseClasses} border-slate-600 bg-slate-900`;
    };

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex justify-center items-center z-[1000] backdrop-blur-sm">
            <div className="bg-slate-800 p-8 rounded-xl w-full max-w-[500px] border border-slate-600 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]">
                <h2 className="mt-0 text-slate-50">Configuration</h2>
                <p className="text-slate-400 mb-6">Setup your repository and AI assistant.</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-slate-50">Repository Path</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={path}
                                onChange={handlePathChange}
                                placeholder="/Users/username/projects/my-repo"
                                className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            <button type="button" onClick={handleBrowse} className="px-4 bg-slate-600 text-slate-50 border border-slate-600 rounded-md cursor-pointer flex items-center justify-center transition-all hover:bg-slate-900 hover:border-blue-500" title="Browse Folder">
                                <FolderOpen size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-slate-50">AI Assistant</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['claude', 'codex', 'gemini'].map(tool => {
                                const isAvailable = availableTools[tool as keyof AiToolsCheckResult];
                                const isSelected = aiTool === tool;
                                return (
                                    <label key={tool} className={getToolOptionClasses(tool, isSelected, isAvailable)}>
                                        <input
                                            type="radio"
                                            name="aiTool"
                                            value={tool}
                                            checked={isSelected}
                                            onChange={handleAiToolChange}
                                            disabled={!isAvailable}
                                            className="hidden"
                                        />
                                        <span className="font-medium capitalize">{tool}</span>
                                        {isAvailable ? <span className="text-green-500 text-[10px]">●</span> : <span className="text-slate-400 text-[10px]">○</span>}
                                    </label>
                                );
                            })}
                        </div>
                        {checkingTools && <span className="text-xs text-slate-400 mt-2 block">Checking tools...</span>}
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-slate-50">Files to copy into worktrees</label>
                        <textarea
                            value={copyFiles}
                            onChange={(e) => setCopyFiles(e.target.value)}
                            placeholder={'.env\n.env.local'}
                            rows={3}
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-md text-slate-50 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-y"
                        />
                        <p className="text-xs text-slate-400 mt-1">One path per line (relative to repo root or absolute). These files are copied into each new worktree (e.g. .env).</p>
                    </div>

                    <div className="flex gap-3 mt-6">
                        {onClose && (
                            <button type="button" onClick={onClose} className="flex-1 p-3 bg-transparent text-slate-400 border border-slate-600 rounded-md text-base font-medium cursor-pointer transition-all hover:bg-slate-600 hover:text-slate-50">
                                Cancel
                            </button>
                        )}
                        <button type="submit" className="w-full p-3 bg-blue-500 text-white border-0 rounded-md text-base font-medium cursor-pointer transition-opacity hover:bg-blue-600 disabled:opacity-70 disabled:cursor-not-allowed" disabled={loading || !path}>
                            Save Configuration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
