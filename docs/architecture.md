# Vibetree Architecture

## Overview

Vibetree is a local AI-enhanced task manager designed for developers to seamlessly manage tasks with Git integration and AI assistant support. The application follows a modern architecture using tRPC for end-to-end type safety between the TypeScript backend and frontend.

## Technology Stack

### Frontend (Client)
- **React 18.2**: UI library for building component-based interfaces
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **tRPC Client**: Type-safe API client
- **TanStack Query**: Async state management and data fetching
- **React Router DOM**: Client-side routing
- **Socket.IO Client**: Real-time bidirectional communication (terminals)
- **xterm.js**: Terminal emulator in the browser
- **Lucide React**: Icon library

### Backend (Server)
- **Node.js**: JavaScript runtime
- **Express 5**: Web application framework
- **tRPC Server**: Type-safe API endpoints
- **Zod**: Runtime schema validation
- **TypeScript**: Type-safe development (compiled to JavaScript)
- **Socket.IO**: Real-time communication with clients
- **LowDB 7**: Lightweight JSON-based database
- **node-pty**: Pseudo-terminal handling
- **CORS**: Cross-origin resource sharing

### Build & Development Tools
- **npm workspaces**: Monorepo management
- **concurrently**: Running multiple processes simultaneously
- **TSC**: TypeScript compiler

## Project Structure

```
vibetree/
├── bin/                    # CLI entry point
│   └── vibetree.js       # Command-line interface script
├── client/                 # React frontend (Vite)
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── ConfirmationModal.tsx
│   │   │   ├── CreateTaskModal.tsx
│   │   │   ├── KanbanBoard.tsx   # Main Task View
│   │   │   ├── LanguageSelector.tsx
│   │   │   ├── RepoModal.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   └── TerminalView.tsx
│   │   ├── context/       # React context providers
│   │   │   ├── TaskContext.tsx
│   │   │   └── TerminalContext.tsx
│   │   ├── i18n/          # Internationalization resources
│   │   │   ├── config.ts
│   │   │   └── locales/
│   │   │       ├── en.json
│   │   │       ├── ja.json
│   │   │       ├── ko.json
│   │   │       └── zh.json
│   │   ├── assets/        # Images and other assets
│   │   ├── trpc.ts        # tRPC client instance
│   │   ├── types.ts       # Shared type definitions
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx       # Application entry point
│   ├── index.html         # HTML template
│   ├── package.json       # Client dependencies
│   ├── tsconfig.json      # TypeScript configuration
│   └── vite.config.ts     # Vite configuration
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── api/           # tRPC router and API-related setup
│   │   │   ├── router.ts
│   │   │   └── trpc.ts
│   │   ├── config/        # Server configuration
│   │   │   └── index.ts
│   │   ├── services/      # Business logic and helper functions
│   │   │   ├── db.ts              # Database initialization and access
│   │   │   ├── git.ts             # Git helper functions (worktree, status, diff)
│   │   │   ├── tasks.ts           # Task helper functions
│   │   │   └── terminal.ts        # Terminal emulator management
│   │   ├── index.ts       # Server entry point
│   │   └── types/         # Shared type definitions
│   │       └── index.ts
│   ├── package.json       # Server dependencies
│   ├── README_TESTS.md    # Server tests README
│   ├── tsconfig.json      # TypeScript configuration (compiles to dist/)
│   └── vitest.config.ts   # Vitest configuration
├── docs/                   # Documentation
│   └── architecture.md    # This file
├── package.json            # Root package.json (workspace configuration)
|── vibetree_config.json    # Persistent configuration (git ignored)
└── README.md              # Project README
```

## Architecture Layers

### 1. CLI Layer (`bin/`)

**Purpose**: Provide a command-line interface for launching the application.

**Key File**: `bin/vibetree.js`

**Responsibilities**:
- Parse command-line arguments (repository path, AI tool selection)
- Load or prompt for configuration
- Set up environment variables
- Launch the server process
- Optionally open the browser

### 2. Server Layer (`server/`)

**Purpose**: Backend server handling business logic, data persistence, and Git operations via tRPC.

**Entry Point**: `server/src/index.ts`

**Core Modules**:

#### `server/src/index.ts` - Server Initialization
- Express application setup
- tRPC middleware configuration (`/api/trpc`)
- Socket.IO initialization
- State management injection

#### `server/src/api/router.ts` - tRPC App Router
- Defines the `AppRouter`
- Implements procedures for:
  - **Config**: `getConfig`, `updateConfig`
  - **Tasks**: `getTasks`, `createTask`, `updateTask`, `deleteTask`
  - **Git**: `getGitStatus`, `getGitDiff`, `createCommit`
  - **System**: `pickFolder`, `getAiTools`

#### `server/src/api/trpc.ts` - tRPC Context
- Initializes tRPC
- Defines the `Context` interface (State + Helpers)

#### `server/src/config/index.ts` - Configuration Module
- Handles application-wide configurations and settings.

#### `server/src/services/db.ts` - Data Persistence Service
- LowDB initialization
- JSON-based database operations

#### `server/src/services/git.ts` - Git Service
- Pure helper functions for Git logic (worktree, status, diff)
- Used by tRPC procedures

#### `server/src/services/tasks.ts` - Task Service
- Pure helper functions for task logic
- Used by tRPC procedures

#### `server/src/services/terminal.ts` - Terminal Emulation Service
- Pseudo-terminal (PTY) management via `node-pty`
- Socket.IO handlers for terminal events

#### `server/src/types/index.ts` - Shared Type Definitions
- Contains TypeScript type definitions shared across server modules.


### 3. Client Layer (`client/`)

**Purpose**: React-based frontend providing the user interface using tRPC hooks.

**Entry Point**: `client/src/main.tsx`

**Core Components**:

#### `App.tsx` - Application Root
- Sets up `trpc.Provider` and `QueryClientProvider`
- Configures tRPC client with links (HTTP batching)

#### `trpc.ts` - tRPC Client
- Creates the typed tRPC hooks (`createTRPCReact`)
- Imports `AppRouter` type from server (no code import)

#### `TaskContext.tsx` - Task Context Provider
- Refactored to use `trpc.useQuery` and `trpc.useMutation`
- Manages optimistic updates and cache invalidation for tasks.

#### `TerminalContext.tsx` - Terminal Context Provider
- Manages the state and functionality related to the terminal emulator.

#### `i18n/` - Internationalization
- Contains configuration (`config.ts`) and translation files (`locales/`) for different languages.

#### Components (`KanbanBoard`, `TaskDetail`, etc.)
- specialized UI components
- `TaskDetail` fetches Git Diff directly via `trpc.getGitDiff.useQuery`
- `RepoModal` uses `trpc.pickFolder.useMutation`

## Data Flow

### tRPC Operation Flow
1. **User Action**: User interacts with UI (e.g., creates task)
2. **Hook Call**: Component calls `trpc.createTask.useMutation`
3. **Type Check**: TypeScript validates input arguments against Zod schema
4. **Network Request**: JSON payload sent to `/api/trpc/createTask`
5. **Procedure Execution**: Server `router.ts` executes the procedure
6. **Helper Execution**: Procedure calls helpers in `tasks.ts`/`git.ts`
7. **Side Effects**: Worktrees created, DB updated
8. **Response**: Type-safe response returned to client
9. **Cache Update**: TanStack Query updates client cache, triggering re-renders

### Real-time Terminal Flow
(Unchanged from previous architecture - uses pure Socket.IO)

## API Procedures (tRPC)

### Config
- `getConfig`: `() => AppConfig`
- `updateConfig`: `(repoPath?, aiTool?, copyFiles?) => AppConfig`

### Tasks
- `getTasks`: `() => Task[]`
- `createTask`: `(title, description?) => Task`
- `updateTask`: `(id, updates) => Task`
- `deleteTask`: `(id) => { success: boolean }`

### Git
- `getGitStatus`: `(taskId?) => { branch, status }`
- `getGitDiff`: `(taskId?) => { diff }`
- `createCommit`: `(taskId?, message) => { success: boolean }`

### System
- `pickFolder`: `() => { path?: string, canceled?: boolean }`
- `getAiTools`: `() => Record<string, boolean>`

## Key Design Decisions

### tRPC for API
Replaced REST with tRPC to achieve:
- **End-to-End Type Safety**: Changes in backend types immediately flag errors in frontend code.
- **Developer Experience**: Autocomplete for API methods and inputs/outputs.
- **Reduced Boilerplate**: No need to manually type `fetch` responses or maintain separate API client files.

### TanStack Query (React Query)
Used via tRPC for:
- **Caching**: Automatic caching and background refetching.
- **State Management**: Replaces complex global state for server data.

### Socket.IO for Terminals
Kept Socket.IO for terminals because tRPC is request/response based, whereas terminals require streaming, bidirectional, persistent connections.
