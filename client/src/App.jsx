import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TaskProvider } from './context/TaskContext';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetail } from './components/TaskDetail';

function App() {
  return (
    <Router>
      <TaskProvider>
        <Routes>
          <Route path="/" element={<KanbanBoard />} />
          <Route path="/task/:id" element={<TaskDetail />} />
        </Routes>
      </TaskProvider>
    </Router>
  );
}

export default App;
