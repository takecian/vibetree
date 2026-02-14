# Development Guide

This guide covers the essential steps and rules for developing Vibetree.

## Prerequisites

Before you begin development, ensure you have the following installed:

- **Node.js**: v18 or higher (LTS recommended)
- **npm**: v7 or higher (comes with Node.js)
- **Git**: For version control and testing Git integration features
- **AI Tools** (Optional, for testing AI features):
  - `claude` (Claude CLI)
  - `gemini` (Gemini CLI)
  - `codex`

## Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/takecian/vibetree.git
   cd vibetree
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   This installs dependencies for the root, client, and server workspaces using npm workspaces.

3. **Build the project**:
   ```bash
   npm run build
   ```
   This compiles TypeScript for both client and server.

## Development Workflow

### Running in Development Mode

To start the application with hot-reloading:

```bash
npm run dev
```

This starts:
- Server on `http://localhost:3000` (or `VIBE_FLOW_PORT` from `.env`)
- Client on `http://localhost:5179` (Vite dev server)

The client proxies API requests to the server during development.

### Building for Production

To build both client and server:

```bash
npm run build
```

This runs:
- `npm run build -w client`: Compiles React app with Vite
- `npm run build -w server`: Compiles TypeScript to `server/dist/`

### Running Tests

The server includes comprehensive unit tests using Vitest.

**Run all tests**:
```bash
npm test -w server
```

**Watch mode** (auto-runs tests on file changes):
```bash
npm run test:watch -w server
```

**Test UI** (interactive test runner):
```bash
npm run test:ui -w server
```

**Coverage report**:
```bash
npm run test:coverage -w server
```

### Linting

The client includes ESLint for code quality.

**Run linter**:
```bash
npm run lint -w client
```

## Project Structure

```
vibetree/
├── bin/                    # CLI entry point
│   └── vibetree.js        # Command-line interface
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # React context providers
│   │   ├── trpc.ts        # tRPC client setup
│   │   └── types.ts       # Type definitions
│   └── package.json       # Client dependencies
├── server/                 # Express.js backend
│   ├── db.ts              # Database (LowDB)
│   ├── git.ts             # Git operations
│   ├── router.ts          # tRPC router
│   ├── tasks.ts           # Task helpers
│   ├── terminal.ts        # Terminal management
│   └── package.json       # Server dependencies
├── docs/                   # Documentation
└── package.json           # Root workspace config
```

## Development Rules and Conventions

### Code Style

1. **TypeScript**: Always use TypeScript for both client and server code
   - Enable strict mode
   - Define proper types, avoid `any`
   - Use Zod for runtime validation

2. **React Components**:
   - Use functional components with hooks
   - Prefer named exports for components
   - Use TypeScript interfaces for props

3. **File Naming**:
   - React components: PascalCase (e.g., `TaskDetail.tsx`)
   - Utilities and helpers: camelCase (e.g., `git.ts`, `tasks.ts`)
   - Test files: `*.test.ts` or `*.test.tsx`

4. **Imports**:
   - Group imports: external packages, internal modules, types
   - Use absolute imports where configured

### Architecture Patterns

1. **tRPC for API**:
   - All client-server communication uses tRPC (except terminals)
   - Define procedures in `server/router.ts`
   - Use Zod schemas for input validation
   - Export `AppRouter` type for client consumption

2. **State Management**:
   - Use TanStack Query (React Query) via tRPC hooks
   - Server state: tRPC queries and mutations
   - Local state: React hooks (`useState`, `useContext`)

3. **Socket.IO for Terminals**:
   - Use Socket.IO for real-time terminal communication
   - Keep terminal logic in `server/terminal.ts`
   - Use xterm.js on the client

4. **Database**:
   - Use LowDB for simple JSON-based persistence
   - Database file: `db.json` (git-ignored)
   - Define schemas in `server/types.ts`

### Git Practices

1. **Commit Messages**:
   - Use clear, descriptive commit messages
   - Start with a verb in present tense (e.g., "Add", "Fix", "Update")
   - Keep the first line under 72 characters

2. **Branches**:
   - Create feature branches from `main`
   - Use descriptive branch names (e.g., `feature/ai-tool-detection`)

3. **Pull Requests**:
   - Ensure all tests pass before submitting
   - Update documentation if needed
   - Request review from maintainers

### Testing Guidelines

1. **Unit Tests**:
   - Write tests for server-side logic (helpers, utilities)
   - Test files: `*.test.ts` in server directory
   - Use Vitest for testing framework
   - Aim for meaningful coverage of critical paths

2. **Test Structure**:
   - Use `describe` blocks to group related tests
   - Use clear test descriptions
   - Mock external dependencies (filesystem, Git operations)

3. **Running Tests**:
   - Run tests before committing
   - Check coverage for new features
   - Fix failing tests immediately

### Security Practices

1. **Input Validation**:
   - Always validate user input with Zod schemas
   - Sanitize shell commands to prevent injection
   - Use the `escapeForShellDoubleQuoted` pattern for user input in commands

2. **File Operations**:
   - Validate file paths before operations
   - Check file existence and permissions
   - Handle errors gracefully

3. **Dependencies**:
   - Keep dependencies updated
   - Review security advisories regularly
   - Audit dependencies with `npm audit`

## Common Development Tasks

### Adding a New tRPC Procedure

1. Define the procedure in `server/router.ts`:
   ```typescript
   myProcedure: publicProcedure
     .input(z.object({ ... }))
     .query(async ({ input, ctx }) => {
       // Implementation
     }),
   ```

2. Use the procedure in the client:
   ```typescript
   const { data } = trpc.myProcedure.useQuery({ ... });
   ```

### Adding a New Component

1. Create the component file in `client/src/components/`
2. Define TypeScript interfaces for props
3. Import and use in parent components
4. Style with Tailwind CSS classes

### Modifying the Database Schema

1. Update type definitions in `server/types.ts`
2. Update database initialization in `server/db.ts`
3. Add migration logic if needed for existing data
4. Update related tRPC procedures

## Environment Variables

Create a `.env` file in the root directory (not committed to Git):

```
VIBE_FLOW_PORT=3000
```

- `VIBE_FLOW_PORT`: Server port (default: 3000)

## Troubleshooting

### Build Errors

- **TypeScript errors**: Check `tsconfig.json` configuration
- **Missing dependencies**: Run `npm install` in the root directory
- **Port conflicts**: Change `VIBE_FLOW_PORT` in `.env`

### Development Server Issues

- **Server not starting**: Check if port is already in use
- **Client not connecting**: Ensure proxy configuration in `client/vite.config.ts`
- **Hot reload not working**: Restart the dev server

### Testing Issues

- **Tests failing**: Check mock implementations and test data
- **Coverage not generated**: Ensure that a coverage provider like `@vitest/coverage-v8` is installed

## Resources

- [Architecture Documentation](architecture.md) - Detailed architecture overview
- [How to Release](how-to-release.md) - Release process
- [tRPC Documentation](https://trpc.io/) - tRPC framework
- [React Query Documentation](https://tanstack.com/query/latest) - State management
- [Vite Documentation](https://vitejs.dev/) - Build tool

## Getting Help

- Check existing [GitHub Issues](https://github.com/takecian/vibetree/issues)
- Create a new issue for bugs or feature requests
- Review the documentation in the `docs/` directory
