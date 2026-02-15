import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskBoard } from './TaskBoard';
import { TaskProvider } from '../context/TaskContext';
import { vi } from 'vitest';

vi.mock('../api/trpc', () => ({
  trpc: {
    getTasks: {
      useQuery: () => ({ data: [], isLoading: false }),
    },
    createTask: {
      useMutation: () => ({
        mutateAsync: () => Promise.resolve({ id: 'new-task-id', title: 'New Task', description: '' }),
      }),
    },
  },
}));

describe('TaskBoard', () => {
  it('should select the new task after it is created', async () => {
    render(
      <TaskProvider>
        <TaskBoard repoPath="/test-repo" />
      </TaskProvider>
    );

    fireEvent.click(screen.getByTitle('Add Task'));

    fireEvent.change(screen.getByPlaceholderText('Enter a title for the task...'), {
      target: { value: 'New Task' },
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });

    expect(screen.getByText('New Task')).toHaveClass('text-blue-400');
  });
});
