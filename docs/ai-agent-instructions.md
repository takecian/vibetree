# AI Agent Instructions

This document explains the various agent instruction files in the repository and their purposes.

## File Overview

### `AGENTS.md` (Master File)

**Purpose**: Master repository context file for all AI coding assistants  
**Read by**: All AI tools via symbolic links  
**Location**: Root directory  

This is the **single source of truth** for all AI agent instructions. All other instruction files are symbolic links pointing to this file.

### `.github/copilot-instructions.md` → `AGENTS.md`

**Purpose**: Custom instructions for GitHub Copilot  
**Read by**: GitHub Copilot (the AI pair programmer integrated in VS Code, GitHub.com, etc.)  
**When**: Automatically read by Copilot when providing code suggestions  
**Location**: `.github/` directory (required by GitHub Copilot)  
**Implementation**: Symbolic link to `../AGENTS.md`

This is a symbolic link that allows GitHub Copilot to read the same content as other AI tools, ensuring consistency across all assistants.

### `CLAUDE.md` → `AGENTS.md`, `GEMINI.md` → `AGENTS.md`

**Purpose**: Repository context for specific AI coding assistants  
**Read by**: Claude, Gemini, or custom agents when explicitly configured  
**Location**: Root directory for easy discovery  
**Implementation**: Symbolic links to `AGENTS.md`

These symbolic links allow different AI tools to discover and read the repository instructions using their conventional filenames while maintaining a single source of truth.

## Which File Does Copilot Read First?

**GitHub Copilot reads `.github/copilot-instructions.md`**, which is a symbolic link to `AGENTS.md`.

Since `.github/copilot-instructions.md` is a symbolic link, GitHub Copilot actually reads the content from `AGENTS.md`, ensuring all AI tools work from the same single source of truth.

## Best Practices

1. **Single Source of Truth**: Update only `AGENTS.md` - all other files are symbolic links and will automatically reflect the changes.

2. **For GitHub Copilot users**: The `.github/copilot-instructions.md` symbolic link ensures Copilot reads from the same source as other AI tools.

3. **Consistency Guaranteed**: Since all instruction files are symbolic links to `AGENTS.md`, there's no risk of files getting out of sync.

## File Structure

```
AGENTS.md                            # Master file - edit this
├── CLAUDE.md -> AGENTS.md          # Symlink
├── GEMINI.md -> AGENTS.md          # Symlink
└── .github/
    └── copilot-instructions.md -> ../AGENTS.md  # Symlink
```

## References

- [GitHub Copilot Instructions Documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
