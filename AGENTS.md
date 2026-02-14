# Repository Summary: Vibetree

Vibetree is an AI-enhanced local task manager designed for developers, integrating task management with Git and AI tools. It aims to streamline development workflows by providing features such as:

-   **Task List**: A focused single-list interface for managing tasks.
-   **Git Integration**: Allows selection and management of local Git repositories, automatic creation of Git worktrees per task, and direct UI access to Git status, diffs, commits, and PRs.
-   **AI Assistant Integration**: Supports local CLI AI tools like Claude, Codex, and Gemini, featuring robust tool detection and an integrated terminal for executing AI commands and scripts.
-   **Task Management**: Comprehensive task creation with detailed descriptions and progress tracking.
-   **Native System Integration**: Includes a native directory picker and an embedded terminal emulator (xterm.js).
-   **Modern UI**: Built with React, Vite, and tRPC for end-to-end type safety, featuring a dark mode optimized interface.

## Project Structure:
The repository is structured into three main parts:
-   `client/`: Houses the React frontend, built with Vite and tRPC.
-   `server/`: Contains the Express.js backend with tRPC router.
-   `bin/`: Includes the CLI entry point for the application.

This setup facilitates seamless interaction between the user interface, the backend logic, and the integrated AI and Git functionalities.

## Documentation

For detailed technical information, please refer to:
-   [Architecture Documentation](docs/architecture.md) - Comprehensive architecture overview, technology stack, data flow, API procedures, and design decisions
-   [Development Guide](docs/development.md) - Development setup, workflow, rules, conventions, and best practices
-   [How to Release](docs/how-to-release.md) - Instructions on how to release a new version of the project
