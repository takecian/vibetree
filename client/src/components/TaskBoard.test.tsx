import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskBoard } from './TaskBoard';
import { TaskProvider } from '../context/TaskContext';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'taskList.addTask') return 'Add Task';
      if (key === 'taskList.title') return 'Tasks';
      if (key === 'taskList.empty') return 'No tasks found';
      if (key === 'taskList.pullMainBranch') return 'Pull Main Branch';
      if (key === 'createTask.titlePlaceholder') return 'Enter a title for the task...';
      if (key === 'createTask.createButton') return 'Create';
      return key;
    }
  })
}));

vi.mock('../api/trpc', () => ({
  trpc: {
    getConfig: {
      useQuery: () => ({ data: [], isLoading: false }),
    },
    getRepositories: {
      useQuery: () => ({ data: [], isLoading: false }),
    },
    getTasks: {
      useQuery: () => ({ data: [], isLoading: false }),
    },
    createTask: {
      useMutation: () => ({
        mutateAsync: () => Promise.resolve({ id: 'new-task-id', title: 'New Task', description: '' }),
      }),
    },
    updateConfig: {
      useMutation: () => ({ mutateAsync: vi.fn() }),
    },
    addRepository: {
      useMutation: () => ({ mutateAsync: vi.fn() }),
    },
    deleteTask: {
      useMutation: () => ({ mutateAsync: vi.fn() }),
    },
    updateRepository: {
      useMutation: () => ({ mutateAsync: vi.fn() }),
    },
    deleteRepository: {
      useMutation: () => ({ mutateAsync: vi.fn() }),
    },
    pullMainBranch: {
      useMutation: () => ({ mutateAsync: vi.fn() }),
    },
    useUtils: () => ({
      getConfig: {
        setData: vi.fn(),
      },
      getRepositories: {
        invalidate: vi.fn(),
      },
      getTasks: {
        invalidate: vi.fn(),
      },
    }),
  },
}));

describe('TaskBoard', () => {
  it('should select the new task after it is created', async () => {
    const handleTaskSelect = vi.fn();

    render(
      <TaskProvider>
        <TaskBoard repoPath="/test-repo" selectedTaskId={null} onTaskSelect={handleTaskSelect} />
      </TaskProvider>
    );

    fireEvent.click(screen.getByTitle('Add Task'));

    fireEvent.change(screen.getByPlaceholderText('Enter a title for the task...'), {
      target: { value: 'New Task' },
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(handleTaskSelect).toHaveBeenCalledWith('new-task-id');
    });
  });
});
