# Vibe-Flow Architecture

## Overview

Vibe-Flow is a local AI-enhanced Kanban board designed for developers to seamlessly manage tasks with Git integration and AI assistant support. The application follows a classic three-tier architecture with a CLI entry point, an Express.js backend server, and a React-based frontend client.

## Technology Stack

### Frontend (Client)
- **React 18.2**: UI library for building component-based interfaces
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **React Router DOM**: Client-side routing
- **@hello-pangea/dnd**: Drag-and-drop functionality for Kanban board
- **Socket.IO Client**: Real-time bidirectional communication
- **xterm.js**: Terminal emulator in the browser
- **Lucide React**: Icon library

### Backend (Server)
- **Node.js**: JavaScript runtime
- **Express 5**: Web application framework
- **TypeScript**: Type-safe development (compiled to JavaScript)
- **Socket.IO**: Real-time communication with clients
- **LowDB 7**: Lightweight JSON-based database
- **node-pty**: Pseudo-terminal handling for embedded terminals
- **CORS**: Cross-origin resource sharing

### Build & Development Tools
- **npm workspaces**: Monorepo management
- **concurrently**: Running multiple processes simultaneously
- **TSC**: TypeScript compiler

## Project Structure

```
vibe-flow/
├── bin/                    # CLI entry point
│   └── vibe-flow.js       # Command-line interface script
├── client/                 # React frontend (Vite)
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── CreateTaskModal.tsx
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── RepoModal.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   └── TerminalView.tsx
│   │   ├── context/       # React context providers
│   │   │   └── TaskContext.tsx
│   │   ├── assets/        # Images and other assets
│   │   ├── api.ts         # API client functions
│   │   ├── types.ts       # TypeScript type definitions
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx       # Application entry point
│   ├── index.html         # HTML template
│   ├── package.json       # Client dependencies
│   ├── tsconfig.json      # TypeScript configuration
│   └── vite.config.ts     # Vite configuration
├── server/                 # Express.js backend
│   ├── db.ts              # Database initialization and access
│   ├── git.ts             # Git operations (worktree, status, diff, commit)
│   ├── index.ts           # Server entry point and configuration
│   ├── system.ts          # System operations (directory picker, AI tools)
│   ├── tasks.ts           # Task management routes
│   ├── terminal.ts        # Terminal emulator management
│   ├── types.ts           # TypeScript type definitions
│   ├── package.json       # Server dependencies
│   └── tsconfig.json      # TypeScript configuration (compiles to dist/)
├── docs/                   # Documentation
│   └── architecture.md    # This file
├── package.json            # Root package.json (workspace configuration)
└── README.md              # Project README

```

## Architecture Layers

### 1. CLI Layer (`bin/`)

**Purpose**: Provide a command-line interface for launching the application.

**Key File**: `bin/vibe-flow.js`

**Responsibilities**:
- Parse command-line arguments (repository path, AI tool selection)
- Load or prompt for configuration
- Set up environment variables
- Launch the server process
- Optionally open the browser

**Command-line Options**:
- `--repo, -r`: Specify target repository path
- `--ai, -a`: Choose AI tool (claude, codex, gemini)

### 2. Server Layer (`server/`)

**Purpose**: Backend API server handling business logic, data persistence, Git operations, and terminal management.

**Entry Point**: `server/index.ts`

**Core Modules**:

#### `index.ts` - Server Configuration
- Express application setup
- HTTP server creation
- Socket.IO initialization
- CORS configuration
- Route registration
- State management (repository path, AI tool)

#### `db.ts` - Data Persistence
- LowDB initialization
- JSON-based database operations
- Task storage and retrieval
- Database schema management

#### `tasks.ts` - Task Management
- CRUD operations for tasks
- Task status updates
- Task assignment and tracking
- RESTful API endpoints:
  - `GET /api/tasks` - List all tasks
  - `POST /api/tasks` - Create a new task
  - `GET /api/tasks/:id` - Get task by ID
  - `PUT /api/tasks/:id` - Update task
  - `DELETE /api/tasks/:id` - Delete task

#### `git.ts` - Git Integration
- Repository management
- Worktree creation and deletion
- Git status and diff operations
- Commit creation
- Pull request helpers
- API endpoints:
  - `POST /api/git/worktree` - Create worktree for task
  - `GET /api/git/status` - Get git status
  - `GET /api/git/diff` - Get git diff
  - `POST /api/git/commit` - Create commit
  - `DELETE /api/git/worktree/:taskId` - Delete worktree

#### `system.ts` - System Operations
- Native directory picker
- AI tool detection (PATH and config files)
- System configuration
- API endpoints:
  - `POST /api/system/select-directory` - Open directory picker
  - `GET /api/system/ai-tools` - Detect available AI tools

#### `terminal.ts` - Terminal Emulation
- Pseudo-terminal (PTY) management
- Socket.IO-based terminal sessions
- Process spawning and management
- Input/output streaming

**Server Configuration**:
- Default port: 3000
- Environment variables:
  - `REPO_PATH`: Target repository path
  - `AI_TOOL`: Selected AI assistant
  - `PORT`: Server port

### 3. Client Layer (`client/`)

**Purpose**: React-based frontend providing the user interface for task management and Git operations.

**Entry Point**: `client/src/main.tsx`

**Core Components**:

#### `App.tsx` - Application Root
- React Router setup
- Route definitions
- TaskProvider wrapper

#### `KanbanBoard.tsx` - Main Board View
- Drag-and-drop Kanban board
- Task columns (Todo, In Progress, In Review, Done, Cancelled)
- Task creation modal trigger
- Settings modal for repository configuration
- Real-time task updates

#### `TaskDetail.tsx` - Task Detail View
- Individual task information
- Worktree management
- Embedded terminal
- Git operations (status, diff, commit)
- Task status updates

#### `TerminalView.tsx` - Terminal Emulator
- xterm.js integration
- Socket.IO communication for terminal I/O
- Fit addon for responsive sizing

#### `CreateTaskModal.tsx` - Task Creation
- Task title and description input
- Task creation form

#### `RepoModal.tsx` - Repository Settings
- Repository path selection
- AI tool selection
- Configuration persistence

#### `TaskContext.tsx` - Global State Management
- React Context for task state
- API integration
- Task CRUD operations
- Configuration management
- Connection status

#### `api.ts` - API Client
- HTTP client functions
- RESTful API calls to server
- Error handling

## Data Flow

### Task Management Flow
1. **User Action**: User interacts with UI (e.g., creates task, drags task)
2. **Context Update**: TaskContext handles the action
3. **API Call**: Context calls API function in `api.ts`
4. **HTTP Request**: Request sent to Express server
5. **Server Processing**: Server module (e.g., `tasks.ts`) processes request
6. **Database Operation**: Data persisted to LowDB
7. **Response**: Server sends response back to client
8. **State Update**: Context updates local state
9. **UI Render**: React re-renders affected components

### Real-time Terminal Flow
1. **Terminal Component Mounted**: TerminalView component initializes
2. **Socket Connection**: Socket.IO client connects to server
3. **PTY Creation**: Server creates pseudo-terminal process
4. **User Input**: User types in terminal
5. **Socket Emit**: Client sends input to server via Socket.IO
6. **PTY Write**: Server writes input to PTY
7. **PTY Output**: PTY process generates output
8. **Socket Emit**: Server sends output to client via Socket.IO
9. **Terminal Display**: Client displays output in xterm.js

### Git Operations Flow
1. **User Action**: User clicks "Setup Worktree" or "View Diff"
2. **API Call**: Client calls Git API endpoint
3. **Git Command**: Server executes Git command via `git.ts`
4. **File System Operation**: Git modifies file system (e.g., creates worktree)
5. **Response**: Server returns result
6. **UI Update**: Client displays result or updates state

## API Endpoints

### Configuration
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Git
- `POST /api/git/worktree` - Create worktree for task
- `GET /api/git/status` - Get git status for task
- `GET /api/git/diff` - Get git diff for task
- `POST /api/git/commit` - Create commit for task
- `DELETE /api/git/worktree/:taskId` - Delete worktree

### System
- `POST /api/system/select-directory` - Open native directory picker
- `GET /api/system/ai-tools` - Detect available AI tools

### Socket.IO Events
- `terminal:create` - Create new terminal session
- `terminal:input` - Send input to terminal
- `terminal:resize` - Resize terminal
- `terminal:output` - Receive output from terminal
- `terminal:exit` - Terminal session ended

## Build and Deployment

### Development

```bash
# Install dependencies for all workspaces
npm install

# Run development servers (client + server)
npm run dev
```

This runs:
- **Client**: `vite` dev server on `http://localhost:5173`
- **Server**: `tsc --watch` (TypeScript compiler) + `node --watch dist/index.js`

### Production Build

```bash
# Build all workspaces
npm run build
```

This runs:
1. **Client Build**: `vite build` - Outputs to `client/dist/`
2. **Server Build**: `tsc` - Compiles TypeScript to `server/dist/`

### Running Production Build

```bash
# Start the application
npm start
```

This executes `bin/vibe-flow.js` which:
1. Parses CLI arguments
2. Loads configuration
3. Launches the server from `server/dist/index.js`

## Key Design Decisions

### TypeScript Throughout
Both client and server are written in TypeScript for:
- Type safety
- Better IDE support
- Reduced runtime errors
- Shared type definitions

### Monorepo with Workspaces
npm workspaces enable:
- Shared dependencies
- Unified build process
- Simplified development workflow

### LowDB for Persistence
JSON-based database chosen for:
- Simplicity (no external database required)
- Local-first approach
- Easy debugging (human-readable JSON)
- Sufficient for single-user application

### Socket.IO for Terminals
WebSocket-based communication for:
- Real-time bidirectional communication
- Efficient terminal I/O streaming
- Automatic reconnection

### React Context for State
Context API chosen over Redux/other libraries for:
- Sufficient for app complexity
- No additional dependencies
- Simpler learning curve
- Direct integration with React

### Git Worktrees
Using Git worktrees instead of branches for:
- Parallel task development
- No context switching
- Isolated working directories
- Preserves main branch state

## Security Considerations

- **Local-only**: Application runs locally, no remote data transmission
- **File System Access**: Server has file system access limited to specified repository
- **Terminal Access**: Terminal runs with user's permissions
- **AI Tool Integration**: Uses CLI tools, no API keys stored in application
- **CORS**: Configured for local development (origin: '*' should be restricted in production)

## Future Extensibility

The architecture supports future enhancements:
- **Remote Repository Support**: Add Git remote operations
- **Multiple Users**: Add authentication and user management
- **Cloud Sync**: Add cloud database option
- **Plugin System**: Support for custom AI tools
- **Webhook Integration**: CI/CD integration
- **Enhanced Git Features**: Merge, rebase, conflict resolution
