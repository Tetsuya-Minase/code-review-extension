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

This is a Chrome extension for AI-powered GitHub code reviews supporting 4 AI providers (OpenAI, Claude, Gemini, OpenAI Compatible). The architecture follows **Layered Architecture** with **TDD principles**.

### Core Components

**Background Service** (`src/background/background.ts`)
- Service worker that handles API communication with multiple AI providers
- Manages CORS-restricted requests (GitHub diff fetching)
- Coordinates multi-step review process (customizable 1-N steps)

**Content Script** (`src/content/content.ts`)
- Injected into GitHub PR pages (`https://github.com/*/pull/*`)
- Manages UI integration (review button, result display)
- Communicates with background service via message passing

**Options Page** (`src/options/`)
- Settings interface for API keys and AI provider configuration
- Review step customization (add/delete/reorder steps)
- Prompt customization for each review step

**Popup** (`src/popup/`)
- Quick access to settings and extension status

**Utilities**
- `GitHubService` - GitHub page manipulation and PR info extraction
- `APIClients` - Multiple AI provider communication (OpenAI, Claude, Gemini, OpenAI Compatible)
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

GitHub's `.diff` endpoint is accessed via background script to bypass CORS restrictions that would occur in content script context. The diff is fetched from:
```
https://github.com/{owner}/{repo}/pull/{number}.diff
```

### Multi-Step Review Process

The extension supports customizable review steps (1 to unlimited):

**Default 3-Step Configuration**:
1. **Step 1**: Initial problem identification and critical issue detection
2. **Step 2**: Detailed code review based on Step 1 results and diff
3. **Step 3**: Improvement suggestions based on Step 2 analysis

**Customizable Features**:
- Add/delete/reorder review steps
- Custom prompts for each step
- Enable/disable individual steps
- Only the final step result is displayed to users

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
- `ExtensionConfig` - Extension settings and AI provider configuration
- `AIProvider` - OpenAI, Claude, Gemini, OpenAI Compatible API communication

### Security Considerations
- API keys stored securely in Chrome Storage API (chrome.storage.sync)
- HTML content sanitization before DOM insertion (XSS prevention)
- API key validation for each provider
- No sensitive data in console logs or error messages
- CORS handling for external API requests

## AI Provider Support

### Supported Providers
- **OpenAI**: GPT-4o, O1-Preview, O1-Mini, GPT-4 Turbo
- **Claude (Anthropic)**: Claude 4 (Sonnet 4), Claude 4 (Opus 4), Claude 3.7 Sonnet
- **Gemini (Google)**: Gemini 2.0 Flash Exp, Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- **OpenAI Compatible**: Ollama, LM Studio, other OpenAI-compatible APIs

### API Implementation Details
- Each provider has custom API format handling
- Claude uses `anthropic-dangerous-direct-browser-access` header for CORS
- Gemini combines system and user prompts
- OpenAI Compatible allows custom base URL configuration

## Review Process Implementation

### Step Execution Flow
1. System prompt: Pre-configured step prompt
2. User prompt: Contains PR diff + previous step results (for step 2+)
3. Result processing: Only final step result displayed to user
4. Progress tracking: Real-time status updates during execution

### Display Logic
- **PR page**: Results shown in right sidebar
- **Files page (/files)**: Results shown above file list
- **Format**: Plain markdown text (no HTML parsing)
- **Content**: Final step result only

## File Structure Notes

- `manifest.json` - Extension manifest (copied to dist during build)
- `vite.config.ts` - Custom build process with static file copying  
- `build.mts` - Build script using tsx and zx libraries
- `src/types/index.ts` - Central type definitions for all components
- `src/options/` - Settings UI for API keys and review step configuration
- `src/popup/` - Quick access popup interface
- `tests/` - Unit tests with coverage requirements
- Static assets automatically copied to `dist/` during build