# How to Release

This document outlines the steps for releasing a new version of the project.

## AI Actions (using `gh` CLI)

The AI can perform the following steps automatically using the `gh` command-line tool:

-   **Bump version:** Update the project version number (e.g., in `package.json`).
    *   Example: `npm version patch` (or `minor`, `major`)
-   **Create tag:** Create a Git tag for the new version.
    *   Example: `git tag v<NEW_VERSION>`
-   **Create release:** Create a GitHub release from the tag.
    *   Example: `gh release create v<NEW_VERSION> --notes "Release v<NEW_VERSION>"`

## Human Actions

The following step requires human intervention due to security requirements:

-   **`npm publish`**: This command publishes the package to npm and requires two-factor authentication (2FA).