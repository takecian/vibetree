import { useState, useMemo } from 'react';
import { parseDiff, Diff, Hunk, File } from 'react-diff-view';
import { ChevronDown, ChevronRight } from 'lucide-react';
import 'react-diff-view/style/index.css';

interface DiffViewProps {
    diffText: string;
}

export function DiffView({ diffText }: DiffViewProps) {
    const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());

    const files = useMemo(() => {
        if (!diffText || diffText.trim() === '') {
            return [];
        }
        try {
            return parseDiff(diffText, { nearbySequences: 'zip' });
        } catch (error) {
            console.error('Failed to parse diff:', error);
            return [];
        }
    }, [diffText]);

    const toggleFileCollapse = (fileName: string) => {
        setCollapsedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileName)) {
                next.delete(fileName);
            } else {
                next.add(fileName);
            }
            return next;
        });
    };

    const renderFile = ({ oldPath, newPath, type, hunks }: File) => {
        const fileName = newPath || oldPath || 'unknown';
        const isCollapsed = collapsedFiles.has(fileName);
        
        // Calculate stats
        const additions = hunks.reduce((sum, hunk) => 
            sum + hunk.changes.filter(change => change.type === 'insert').length, 0
        );
        const deletions = hunks.reduce((sum, hunk) => 
            sum + hunk.changes.filter(change => change.type === 'delete').length, 0
        );

        return (
            <div key={fileName} className="mb-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                <div 
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800 cursor-pointer hover:bg-slate-750 transition-colors"
                    onClick={() => toggleFileCollapse(fileName)}
                >
                    {isCollapsed ? (
                        <ChevronRight size={16} className="text-slate-400" />
                    ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                    )}
                    <span className="flex-1 font-mono text-sm text-slate-100">
                        {type === 'delete' && (
                            <span className="text-red-400">{oldPath}</span>
                        )}
                        {type === 'add' && (
                            <span className="text-green-400">{newPath}</span>
                        )}
                        {type === 'rename' && (
                            <>
                                <span className="text-slate-400">{oldPath}</span>
                                <span className="mx-2 text-slate-500">→</span>
                                <span className="text-blue-400">{newPath}</span>
                            </>
                        )}
                        {type === 'modify' && (
                            <span className="text-slate-100">{fileName}</span>
                        )}
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                        {additions > 0 && (
                            <span className="text-green-400">+{additions}</span>
                        )}
                        {deletions > 0 && (
                            <span className="text-red-400">-{deletions}</span>
                        )}
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="diff-view-wrapper">
                        <Diff 
                            viewType="unified" 
                            diffType={type}
                            hunks={hunks}
                        >
                            {(hunks) => hunks.map((hunk) => (
                                <Hunk key={hunk.content} hunk={hunk} />
                            ))}
                        </Diff>
                    </div>
                )}
            </div>
        );
    };

    if (!diffText || diffText.trim() === '') {
        return (
            <div className="text-center text-slate-500 py-8">
                No changes to display
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className="text-center text-slate-500 py-8">
                Failed to parse diff output
            </div>
        );
    }

    return (
        <div className="diff-view-container">
            {files.map(renderFile)}
        </div>
    );
}
