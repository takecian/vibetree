# Vibetree

Vibetree is a local AI-enhanced Kanban board designed for seamless task management and code integration. It combines a modern React frontend with a robust Node.js backend, built with TypeScript for enhanced type safety and developer experience.

**🔒 Privacy First**: Vibetree runs 100% locally on your machine. No data is sent to external servers - your code, tasks, and AI interactions stay private and secure.

## Quick Start with npx

You can launch Vibetree directly using `npx` without installation:

```bash
npx vibetree
```

The app will start and automatically open in your default browser at `http://localhost:3000`.

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
- **TypeScript**:
    - Fully typed codebase for both client and server.
    - Strict mode enabled for maximum type safety.

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
    git clone https://github.com/takecian/vibetree.git
    cd vibetree
    ```

2.  Install dependencies:
    ```bash
    npm install
    # This will install dependencies for both root, client, and server workspaces.
    ```

3.  Build the project (compiles TypeScript):
    ```bash
    npm run build
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

-   `client/`: React frontend (Vite) - TypeScript with `.tsx` components.
-   `server/`: Express.js backend - TypeScript compiled to `dist/`.
-   `bin/`: CLI entry point.

## License

ISC
