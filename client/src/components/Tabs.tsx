import { X, Plus, Folder } from 'lucide-react';

interface Tab {
    id: string;
    path: string;
    label: string;
}

interface TabsProps {
    tabs: Tab[];
    activeTabId: string | null;
    onTabSelect: (id: string) => void;
    onTabClose: (id: string) => void;
    onAddTab: () => void;
}

export function Tabs({ tabs, activeTabId, onTabSelect, onTabClose, onAddTab }: TabsProps) {
    return (
        <div className="flex items-center bg-slate-800 border-b border-slate-700 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    onClick={() => onTabSelect(tab.id)}
                    className={`group flex items-center h-10 px-4 min-w-[120px] max-w-[240px] border-r border-slate-700 cursor-pointer transition-colors relative ${activeTabId === tab.id
                        ? 'bg-slate-900 text-blue-400'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                        }`}
                >
                    <Folder size={14} className="mr-2 flex-shrink-0" />
                    <span className="truncate text-sm font-medium mr-4">
                        {tab.label}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTabClose(tab.id);
                        }}
                        className={`p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-all absolute right-2 ${activeTabId === tab.id ? 'opacity-100 text-slate-400' : 'text-slate-500'
                            }`}
                    >
                        <X size={12} />
                    </button>
                    {activeTabId === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                    )}
                </div>
            ))}
            <button
                onClick={onAddTab}
                className="p-3 text-slate-400 hover:text-blue-400 transition-colors flex items-center justify-center border-r border-slate-700"
                title="Add Repository"
            >
                <Plus size={18} />
            </button>
        </div>
    );
}
