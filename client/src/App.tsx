import { TaskProvider, useTasks } from './context/TaskContext';
import { TaskBoard } from './components/TaskBoard';
import { RepoModal } from './components/RepoModal';
import { Tabs } from './components/Tabs';
import { TerminalProvider } from './context/TerminalContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './api/trpc';
import { httpBatchLink } from '@trpc/client';
import { LanguageSelector } from './components/LanguageSelector';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { BrowserRouter } from 'react-router-dom';
import { useState, useEffect } from 'react';

const normalizePath = (p: string) => p.replace(/[/\\]+$/, '');

function AppContent() {
  const { t } = useTranslation();
  const { config, updateConfig, repositories, loading, addRepository } = useTasks();
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showAiToolOnlyModal, setShowAiToolOnlyModal] = useState(false);
  const [isAddingRepo, setIsAddingRepo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Record<string, string | null>>({});

  const repoPaths = repositories.map(r => normalizePath(r.path));

  useEffect(() => {
    if (!loading && config && !config.aiTool) {
      setShowAiToolOnlyModal(true);
    }
  }, [loading, config]);

  useEffect(() => {
    if (repoPaths.length > 0) {
      if (!activeTabId || !repoPaths.includes(activeTabId)) {
        setActiveTabId(repoPaths[0]);
      }
    } else {
      setActiveTabId(null);
    }
  }, [repoPaths, activeTabId]);

  const handleAddRepo = async (path: string, aiTool: string, copyFiles: string) => {
    const normalized = normalizePath(path);
    await addRepository(normalized, copyFiles);
    await updateConfig({ repoPath: normalized, aiTool, copyFiles });
    setActiveTabId(normalized);
    setIsAddingRepo(false);
  };

  const handleCloseTab = async (path: string) => {
    // For now, let's just update active tab if needed. 
    // If we want to fully delete from DB, we'd need a deleteRepository mutation.
    // The previous behavior was removing from the list, so let's assume "hide" or "delete".
    // I'll keep it simple: just switch tabs for now unless user wants deletion.
    const newPaths = repoPaths.filter(p => p !== path);
    if (activeTabId === path) {
      setActiveTabId(newPaths[0] || null);
    }
  };

  const handleTaskSelect = (repoPath: string, taskId: string | null) => {
    setSelectedTaskIds(prev => ({
      ...prev,
      [repoPath]: taskId
    }));
  };

  const tabs = repoPaths.map(path => ({
    id: path,
    path,
    label: path.split(/[/\\]/).filter(Boolean).pop() || path
  }));

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading...</div>;

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {(showAiToolOnlyModal || isAddingRepo || showSettings) && (
        <RepoModal
          onSave={showSettings ? (_path, aiTool, copyFiles) => {
            updateConfig({ aiTool, copyFiles });
            setShowSettings(false);
          } : handleAddRepo}
          initialConfig={config}
          onClose={() => {
            setShowAiToolOnlyModal(false);
            setIsAddingRepo(false);
            setShowSettings(false);
          }}
          hideRepoPath={(showAiToolOnlyModal && !isAddingRepo) || showSettings}
          hideAiAssistant={isAddingRepo && !showAiToolOnlyModal && !showSettings}
          hideCopyFiles={showSettings}
        />
      )}

      <header className="px-6 py-4 border-b border-slate-600 flex justify-between items-center bg-slate-800 shadow-lg z-10">
        <div className="flex items-center gap-4">
          <h1 className="m-0 text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">{t('app.title')}</h1>
          <span className="text-slate-400 text-xs">v{import.meta.env.VITE_APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button
            onClick={() => setShowSettings(true)}
            className="bg-transparent border-0 cursor-pointer text-slate-400 p-2 rounded-md flex items-center justify-center transition-all hover:bg-slate-700 hover:text-slate-50"
            title={t('common.settings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <Tabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={handleCloseTab}
        onAddTab={() => setIsAddingRepo(true)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTabId ? (
          <TaskBoard 
            repoPath={activeTabId} 
            selectedTaskId={selectedTaskIds[activeTabId] || null}
            onTaskSelect={(taskId) => handleTaskSelect(activeTabId, taskId)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
            <h2 className="text-xl font-light mb-4">No Repository Open</h2>
            <button
              onClick={() => setIsAddingRepo(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-500 transition-colors"
            >
              Add a Repository to Start
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    }),
  );

  return (
    <BrowserRouter>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <TerminalProvider>
            <TaskProvider>
              <AppContent />
            </TaskProvider>
          </TerminalProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </BrowserRouter>
  );
}

export default App;
