import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TaskProvider } from './context/TaskContext';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetail } from './components/TaskDetail';
import { TerminalProvider } from './context/TerminalContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './trpc';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';

function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:3000/api/trpc',
        }),
      ],
    }),
  );

  return (
    <Router>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <TerminalProvider>
            <TaskProvider>
              <Routes>
                <Route path="/" element={<KanbanBoard />} />
                <Route path="/task/:id" element={<TaskDetail />} />
              </Routes>
            </TaskProvider>
          </TerminalProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </Router>
  );
}

export default App;
