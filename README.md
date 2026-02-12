# Vibe-Flow

Vibe-Flow is a local AI-enhanced Kanban board designed for seamless task management and code integration. It combines a modern React frontend with a robust Node.js backend to provide a fluid workflow for developers.

## Features

- **Kanban Board**: Manage tasks with Todo, In Progress, In Review, Done, and Cancelled statuses.
- **Git Integration**:
    - Select and manage local Git repositories.
    - Create Git worktrees for each task automatically.
    - View git status, diffs, and create commits/PRs directly from the UI.
- **AI Assistant Integration**:
    - Configure and use local CLI AI tools like **Claude**, **Codex**, and **Gemini**.
    - Robust tool detection (checks PATH and configuration files).
    - Integrated terminal for executing AI commands and scripts.
- **Task Management**:
    - Create tasks with titles and detailed descriptions.
    - Track task progress and history.
- **Native System Integration**:
    - Native directory picker for selecting repositories.
    - Terminal emulator (xterm.js) embedded in task details.
- **Modern UI**:
    - Built with React and Vite.
    - Drag-and-drop interface (hello-pangea/dnd).
    - Dark mode optimized.

## Prerequisites

- **Node.js**: (v16+ recommended)
- **Git**: Installed and configured.
- **AI Tools** (Optional but recommended):
    - `claude` (Claude CLI)
    - `gemini` (Gemini CLI)
    - `codex`
    - Ensure these are installed and available in your PATH or configured in their default home directories (e.g., `~/.gemini`).

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/takecian/vibe-flow.git
    cd vibe-flow
    ```

2.  Install dependencies:
    ```bash
    npm install
    # This will install dependencies for both root, client, and server workspaces.
    ```

## Usage

1.  Start the development server (runs both client and server concurrently):
    ```bash
    npm run dev
    ```

2.  Open your browser and navigate to `http://localhost:5173`.

3.  **Setup**:
    - Click the **Settings** (gear icon) in the top right.
    - Select your target Git **Repository Path**.
    - Select your preferred **AI Assistant**.

4.  **Workflow**:
    - Create a new task.
    - Click "Setup Worktree" in the task detail view to create an isolated environment.
    - Use the embedded terminal to run commands or interact with the AI assistant.
    - Drag tasks across columns to update status.

## Project Structure

-   `client/`: React frontend (Vite).
-   `server/`: Express.js backend.
-   `bin/`: CLI entry point.

## License

ISC
