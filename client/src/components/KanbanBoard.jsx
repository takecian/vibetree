import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useTasks } from '../context/TaskContext';
import { useNavigate } from 'react-router-dom';
import { RepoModal } from './RepoModal';
import { CreateTaskModal } from './CreateTaskModal';
import styles from './KanbanBoard.module.css';
import { Plus, Github, Folder, Settings } from 'lucide-react';

const COLUMNS = {
    todo: 'To Do',
    inprogress: 'In Progress',
    inreview: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled'
};

export function KanbanBoard() {
    const { tasks, moveTask, addTask, isConnected, config, setRepoPath } = useTasks();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        if (source.droppableId !== destination.droppableId) {
            moveTask(draggableId, destination.droppableId);
        }
    };

    const handleCreateTask = async (title, description) => {
        await addTask(title, description);
    };

    // Extract repo name from path
    const repoName = config?.repoPath ? config.repoPath.split('/').pop() : 'No Repository';

    const handleSaveConfig = async (path, aiTool) => {
        await setRepoPath(path, aiTool);
        setShowSettings(false);
    };

    return (
        <div className={styles.board}>
            {/* Show modal if NOT connected (forced) OR if settings explicitly open (optional) */}
            {(!isConnected || showSettings) && (
                <RepoModal
                    onSave={handleSaveConfig}
                    initialConfig={config}
                    onClose={isConnected ? () => setShowSettings(false) : undefined}
                />
            )}

            {isCreateModalOpen && (
                <CreateTaskModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateTask}
                />
            )}

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1>Vibe-Flow</h1>
                    {isConnected && (
                        <div className={styles.repoBadge}>
                            <Folder size={14} />
                            <span>{repoName}</span>
                        </div>
                    )}
                </div>
                <div className={styles.headerRight}>
                    <button onClick={() => setShowSettings(true)} className={styles.iconButton} title="Settings">
                        <Settings size={20} />
                    </button>
                    <button onClick={() => setIsCreateModalOpen(true)} className={styles.addButton} disabled={!isConnected}>
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </header>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className={styles.columns}>
                    {Object.entries(COLUMNS).map(([columnId, title]) => (
                        <Droppable key={columnId} droppableId={columnId}>
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={styles.column}
                                >
                                    <h2 className={styles.columnTitle}>{title}</h2>
                                    <div className={styles.taskList}>
                                        {tasks.filter(t => t.status === columnId).map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={styles.taskCard}
                                                        onClick={() => navigate(`/task/${task.id}`)}
                                                    >
                                                        <div className={styles.taskHeader}>
                                                            <span className={styles.taskTitle}>{task.title}</span>
                                                        </div>
                                                        <div className={styles.taskFooter}>
                                                            <span className={styles.taskId}>#{task.id.slice(0, 4)}</span>
                                                            {task.branchName && <div className={styles.badge}><Github size={12} /> {task.branchName}</div>}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
