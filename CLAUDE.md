# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTAMT
Please answer in Japanese.

## Development Commands

### Build and Development
- `npm run build` - Build the extension for production (outputs to `dist/`)
- `npm run dev` - Build in watch mode for development
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Run ESLint with auto-fix

### Testing
- `npm test` - Run all tests with Jest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report (targets: 80% statements, 70% branches)

### Installation
After building, load the `dist/` folder as an unpacked extension in Chrome's extension management page.

## Architecture Overview

This is a Chrome extension for AI-powered GitHub code reviews using OpenAI API. The architecture follows **Layered Architecture** with **TDD principles**.

### Core Components

**Background Service** (`src/background/background.ts`)
- Service worker that handles API communication with OpenAI
- Manages CORS-restricted requests (GitHub diff fetching)
- Coordinates the 3-step review process

**Content Script** (`src/content/content.ts`)
- Injected into GitHub PR pages (`https://github.com/*/pull/*`)
- Manages UI integration (review button, result display)
- Communicates with background service via message passing

**Utilities**
- `GitHubService` - GitHub page manipulation and PR info extraction
- `OpenAIClient` - OpenAI API communication (TODO: implementation pending)
- `StorageService` - Chrome extension storage management

### Message Passing Architecture

The extension uses Chrome's message passing for component communication:

```typescript
// Content Script → Background
chrome.runtime.sendMessage({ type: 'FETCH_PR_DIFF', data: prInfo })
chrome.runtime.sendMessage({ type: 'START_REVIEW', data: reviewRequest })

// Background → Content Script  
chrome.runtime.sendMessage({ type: 'DISPLAY_RESULT', data: reviewContent })
```

### CORS Resolution Strategy

GitHub's `.diff` endpoint is accessed via background script to bypass CORS restrictions that would occur in content script context.

### 3-Step Review Process

1. **Step 1**: Initial problem identification and critical issue detection
2. **Step 2**: Detailed code review based on Step 1 results and diff
3. **Step 3**: Improvement suggestions based on Step 2 analysis

## Development Guidelines

### TDD Requirements
- **Always write tests first** (Red → Green → Refactor cycle)
- Target coverage: 80% statements, 70% branches
- Use Jest with jsdom environment for DOM testing
- Follow AAA (Arrange-Act-Assert) pattern

### Code Standards
- **TypeScript** with strict mode enabled
- **Immutable data patterns** - avoid reassignment, create new structures
- **Pure functions** where possible, isolate side effects
- **TSDoc comments** for all public APIs
- **HTML escaping** for XSS prevention (see `GitHubService.escapeHtml`)

### Type Safety
All inter-component communication uses strongly typed interfaces:
- `PullRequestInfo` - PR metadata extraction
- `ReviewRequest` - Review process data
- `ReviewResult` - Review step outputs
- `OpenAIRequest/Response` - API communication

### Security Considerations
- API keys stored securely in Chrome extension storage
- HTML content sanitization before DOM insertion
- No sensitive data in console logs or error messages

## File Structure Notes

- `manifest.json` - Extension manifest (copied to dist during build)
- `vite.config.ts` - Custom build process with static file copying
- `src/types/index.ts` - Central type definitions for all components
- `tests/` - Unit tests with coverage requirements
- Static assets automatically copied to `dist/` during build