# Backend Server Tests

This directory contains comprehensive unit tests for the Vibetree backend server using Vitest.

## Test Coverage

The test suite covers the following modules:

### 1. Configuration Management (`config.test.ts`)
- **loadConfig**: Tests loading configuration from file, environment variables, and handling errors
- **saveConfig**: Tests saving configuration to disk with proper formatting
- Coverage: 8 tests including edge cases like corrupted files and backward compatibility

### 2. Database Management (`db.test.ts`)
- **initDB**: Tests database initialization, directory creation, and data preservation
- **getDB**: Tests retrieving the database instance
- Coverage: 8 tests including initialization and data persistence scenarios

### 3. Git Operations (`git.test.ts`)
- **runGit**: Tests executing git commands with proper error handling
- **createWorktree**: Tests worktree creation, branch handling, and file copying
- Coverage: 13 tests including file operations, path handling, and edge cases

### 4. Task Management (`tasks.test.ts`)
- **getTaskById**: Tests task retrieval from the database
- Coverage: 5 tests covering task lookup scenarios

### 5. tRPC Router (`router.test.ts`)
- **Config Procedures**: getConfig, updateConfig with validation
- **Task Procedures**: getTasks, createTask, updateTask, deleteTask
- **Git Procedures**: getGitStatus, getGitDiff, createCommit
- **System Procedures**: getAiTools, pickFolder (platform-specific)
- Coverage: 25 tests covering all tRPC endpoints

## Running Tests

### Run all tests
```bash
npm test -w server
```

### Run tests in watch mode
```bash
npm run test:watch -w server
```

### Run tests with UI
```bash
npm run test:ui -w server
```

### Run tests with coverage
```bash
npm run test:coverage -w server
```

## Test Structure

Each test file follows a consistent structure:
- **Setup**: Creates temporary directories and initializes test data
- **Test Cases**: Organized by function/procedure with descriptive names
- **Cleanup**: Removes temporary files and resets state

## Key Testing Patterns

### Temporary Directories
Tests use temporary directories in `/tmp` to avoid interfering with actual repositories:
```typescript
testRepoPath = path.join(os.tmpdir(), `vibetree-test-${Date.now()}`);
```

### Mock Functions
Router tests use Vitest's mock functions to test side effects:
```typescript
mockCreateWorktree = vi.fn().mockResolvedValue({ success: true, path: '...' });
```

### Git Repository Setup
Git tests initialize real git repositories for authentic testing:
```typescript
await execAsync('git init', { cwd: testRepoPath });
await execAsync('git config user.email "test@example.com"', { cwd: testRepoPath });
```

## Continuous Integration

Tests are designed to run in CI environments:
- No dependencies on external services
- Self-contained with temporary directories
- Clean up all test artifacts
- Fast execution (< 1 second total)

## Test Results

Current test statistics:
- **Total Tests**: 59
- **Passing**: 59
- **Coverage**: Comprehensive coverage of core backend functionality

## Contributing

When adding new backend features:
1. Write tests for new functions/endpoints
2. Follow the existing test structure and patterns
3. Ensure tests are isolated and clean up after themselves
4. Run the full test suite before committing
5. Update this README if adding new test files

## Troubleshooting

### Tests fail with "DB not initialized"
Make sure each test initializes its own database instance using `initDB()`.

### Git tests fail
Ensure git is installed and configured in your environment.

### Permission errors
Tests should use temporary directories with proper permissions. Check that `/tmp` is writable.
