# Vibetree

Vibetree is a local AI-enhanced task manager designed for seamless development workflows and Git integration. It combines a modern React frontend with a robust Node.js backend, providing an isolated environment for each task using Git worktrees.

**🔒 Privacy First**: Vibetree runs 100% locally on your machine. No data is sent to external servers - your code, tasks, and AI interactions stay private and secure.

## Quick Start with npx

You can launch Vibetree directly using `npx` without installation:

```bash
npx vibetree
```

> **Note**: Until the next version is published to npm, you can use the latest development version directly from GitHub:
> ```bash
> npx github:takecian/vibetree
> ```

The app will start and automatically open in your default browser at `http://localhost:5179`.

## Features

- **Task Management**:
    - Create tasks with titles and detailed descriptions.
    - Automated environment setup (worktree + terminal) upon task creation.
    - Track task progress in a clean, single-list interface.
- **Git Integration**:
    - Select and manage local Git repositories.
    - Create Git worktrees for each task automatically to isolate changes.
    - View git status, diffs, and create commits/PRs directly from the UI.
- **AI Assistant Integration**:
    - Configure and use local CLI AI tools like **Claude**, **Codex**, and **Gemini**.
    - Robust tool detection (checks PATH and binary locations).
    - Automated AI initialization for new tasks.
    - Integrated terminal for executing AI commands and scripts.
- **Native System Integration**:
    - Native directory picker for selecting repositories.
    - Persistent terminal sessions (xterm.js) for each task.
- **Modern UI**:
    - Built with React and Vite.
    - Clean, focus-oriented interface.
    - Dark mode optimized.
- **TypeScript**:
    - Fully typed codebase for both client and server.

## Prerequisites

- **Node.js**: (v24 recommended)
- **Git**: Installed and configured.
- **AI Tools** (Optional but recommended):
    - `claude` (Claude CLI)
    - `gemini` (Gemini CLI)
    - `codex`
    - Ensure these are installed and available in your PATH.

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

1.  Start the development server:
    ```bash
    npm run dev
    ```

2.  Open your browser and navigate to `http://localhost:5179` (or the port specified in the log).

3.  **Setup**:
    - Click the **Settings** (gear icon) in the top right.
    - Select your target Git **Repository Path**.
    - Select your preferred **AI Assistant**.

4.  **Workflow**:
    - **Create a Task**: Enter a title and description. Vibetree automatically creates a Git worktree and initializes a terminal session.
    - **Work**: Use the embedded terminal to run commands. The AI assistant is automatically invoked to provide context-aware help.
    - **review**: Check the **Diff** tab to see your changes in the worktree.
    - **Commit**: (Planned) Commit your changes directly from the UI.

## Project Structure

-   `client/`: React frontend (Vite) - TypeScript with `.tsx` components.
-   `server/`: Express.js backend - TypeScript compiled to `dist/`.
-   `bin/`: CLI entry point.
-   `.entire/`: Internal configurations and logs for the Vibetree CLI.

## License

ISC
