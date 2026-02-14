# GitHub Configuration Files

This directory contains configuration files for GitHub integrations:

## copilot-instructions.md

This is a **symbolic link** to `../AGENTS.md` that provides custom instructions to **GitHub Copilot**. GitHub Copilot reads this file automatically to provide better code suggestions that are aligned with the project's architecture and practices.

By using a symbolic link, we ensure that GitHub Copilot reads the same instructions as other AI tools, maintaining consistency across all AI assistants. To update the instructions, edit `AGENTS.md` in the root directory.

## workflows/

Contains GitHub Actions workflow definitions for CI/CD automation:
- `lint.yml` - Runs linting checks on pull requests
- `test.yml` - Runs automated tests on pull requests
