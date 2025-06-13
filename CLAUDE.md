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

## Detailed Architecture Analysis

### Design Patterns Implementation

**Factory Pattern** (`src/utils/api.ts`)
```typescript
export class AIClientFactory {
  static createClient(provider: AIProvider, apiKey: string, model: string, baseUrl?: string): BaseAIClient {
    switch (provider) {
      case 'openai': return new OpenAIClient(apiKey, model);
      case 'claude': return new ClaudeClient(apiKey, model);
      case 'gemini': return new GeminiClient(apiKey, model);
      case 'openai-compatible': return new OpenAICompatibleClient(apiKey, model, baseUrl);
    }
  }
}
```

**Observer Pattern** (DOM Mutation Monitoring)
```typescript
private setupDOMObserver(): void {
  const observer = new MutationObserver((mutations) => {
    const existingButton = document.querySelector('.code-review-ai-button');
    if (!existingButton && (GitHubService.isPRPage() || GitHubService.isDiffPage())) {
      this.injectReviewButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
```

**Strategy Pattern** (AI Provider Abstraction)
- `BaseAIClient` abstract class defines common interface
- Each provider implements specific API communication logic
- Uniform `executeReview` method across all providers

### Component Communication Flow

```
Content Script              Background Service           AI Providers
     │                           │                           │
     ├─ START_REVIEW ────────────►│                           │
     │                           ├─ Validate Config         │
     │                           ├─ Create AI Client        │
     │                           ├─ Execute Step 1 ─────────►│
     │                           │◄─ Step 1 Result ─────────┤
     │◄─ STEP_COMPLETED ─────────┤                           │
     │                           ├─ Execute Step 2 ─────────►│
     │                           │◄─ Step 2 Result ─────────┤
     │◄─ STEP_COMPLETED ─────────┤                           │
     │                           ├─ Execute Step 3 ─────────►│
     │                           │◄─ Step 3 Result ─────────┤
     │◄─ REVIEW_COMPLETED ───────┤                           │
     ├─ Display Final Result     │                           │
```

### GitHub UI Integration Strategy

**Multi-Selector Approach** for button insertion:
```typescript
const selectors = [
  '.gh-header-actions',           // Primary GitHub UI
  '.gh-header .gh-header-actions', // Nested header actions
  '.timeline-comment-actions',    // Legacy UI
  '.pr-toolbar .diffbar-item',    // Toolbar integration
  '.gh-header-meta',             // Fallback 1
  '.application-main'            // Last resort
];
```

**Fallback Mechanism**: If all selectors fail, creates floating button with `position: fixed`

### Data Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   GitHub DOM    │───►│  Content Script  │───►│ Background Service│
│   (PR/Diff)     │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │                        ▼
                                │                ┌─────────────────┐
                                │                │   AI Providers  │
                                │                │ OpenAI│Claude   │
                                │                │ Gemini│OpenAI-C │
                                │                └─────────────────┘
                                │                        │
                                │                        ▼
                                │                ┌─────────────────┐
                                │                │ Chrome Storage  │
                                │                │ • Config Data   │
                                │                │ • Review Results│
                                │                │ • Display Cache │
                                │                └─────────────────┘
                                │                        │
                                └────────────────────────┘
```

## Advanced Implementation Details

### Error Handling Strategy

**Graceful Degradation**:
- Individual step failures don't stop the entire review process
- Background service continues with remaining steps
- User receives partial results with error indicators

**Timeout Management**:
- Content script implements 5-minute timeout for review requests
- Background service handles long-running AI API calls
- Progress updates prevent user confusion during long operations

### Memory Management

**Immutable Data Patterns**:
```typescript
interface ReviewStepConfig {
  readonly id: string;
  readonly name: string;
  readonly prompt: string;
  readonly enabled: boolean;
  readonly order: number;
}
```

**Storage Optimization**:
- Review results stored per PR ID (`${owner}-${repo}-${number}`)
- Displayed results cached separately for quick restoration
- Configuration migration handled automatically

### Build System Architecture

**Multi-Configuration Vite Setup**:
- `vite.config.content.ts` - Content script bundling
- `vite.config.background.ts` - Service worker bundling  
- `vite.config.options.ts` - Options page bundling
- `vite.config.popup.ts` - Popup bundling

**Static Asset Pipeline**:
```typescript
// build.mts orchestrates:
1. Clean dist directory
2. Build all configurations in sequence
3. Copy static files (HTML, CSS, manifest, icons)
4. Validate build outputs
```

### Testing Architecture

**Comprehensive Test Coverage**:
- **Unit Tests**: Individual component testing with mocked dependencies
- **Integration Tests**: Cross-component communication testing
- **Build Tests**: Verify bundled output correctness (no import statements)
- **DOM Tests**: GitHub UI integration simulation

**Test Patterns**:
```typescript
// AAA Pattern consistently applied
describe('GitHubService.extractPRInfo', () => {
  it('extracts PR information from URL correctly', () => {
    // Arrange
    window.location.pathname = '/owner/repo/pull/123';
    
    // Act
    const prInfo = GitHubService.extractPRInfo();
    
    // Assert
    expect(prInfo).toEqual({
      owner: 'owner', repo: 'repo', number: 123,
      diffUrl: 'https://github.com/owner/repo/pull/123/files'
    });
  });
});
```

## Security Implementation

### XSS Prevention
```typescript
private static escapeHtml(text: string): string {
  const escapeMap: { [key: string]: string } = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}
```

### API Key Validation
```typescript
private validateApiKey(provider: AIProvider, apiKey: string): boolean {
  switch (provider) {
    case 'openai': return apiKey.startsWith('sk-');
    case 'claude': return apiKey.startsWith('sk-ant-');
    case 'gemini': return apiKey.startsWith('AIza');
    case 'openai-compatible': return apiKey.length > 0;
  }
}
```

### CORS Security Model
- Background service acts as proxy for GitHub API calls
- Content script restricted to DOM manipulation only
- All external API requests routed through background service
- Proper manifest permissions for each API endpoint

## File Structure & Dependencies

### Project Structure
```
code-review-extension/
├── src/
│   ├── background/background.ts     # Service worker main logic
│   ├── content/
│   │   ├── content.ts              # GitHub DOM integration
│   │   └── styles.css              # UI styling
│   ├── options/
│   │   ├── options.ts              # Settings management
│   │   ├── options.html            # Settings UI
│   │   └── options.css             # Settings styling
│   ├── popup/
│   │   ├── popup.ts                # Status display
│   │   ├── popup.html              # Popup UI
│   │   └── popup.css               # Popup styling
│   ├── types/index.ts              # Centralized type definitions
│   └── utils/
│       ├── api.ts                  # AI provider clients
│       ├── github.ts               # GitHub service
│       └── storage.ts              # Chrome storage wrapper
├── tests/
│   ├── background.build.test.ts    # Build validation
│   └── utils/github.test.ts        # GitHub service tests
├── build.mts                       # Build orchestration script
├── manifest.json                   # Chrome extension manifest
└── vite.config.*.ts               # Component-specific build configs
```

### External Dependencies
- **Core**: TypeScript 5.3.3, Vite 5.0.10, Jest 29.7.0
- **Chrome APIs**: @types/chrome 0.0.251
- **Build Tools**: tsx 4.20.3, zx 8.5.5
- **Linting**: ESLint 8.56.0 with TypeScript parser
- **Testing**: jest-environment-jsdom for DOM simulation

### Internal Module Dependencies
```
types/index.ts ←── All modules (centralized type definitions)
utils/storage.ts ←── options/, popup/, background/
utils/github.ts ←── content/
utils/api.ts ←── background/
background/ ←── content/ (via Chrome message passing)
```

## Performance Considerations

### Bundle Optimization
- Separate builds prevent code duplication across contexts
- Tree-shaking eliminates unused dependencies
- ES modules format for modern Chrome compatibility

### Runtime Performance
- Lazy loading of AI clients (factory pattern)
- DOM mutation observer with debouncing
- Efficient selector fallback chain
- Chrome storage caching for configuration data

### Memory Usage
- Immutable data structures prevent memory leaks
- Proper cleanup of event listeners and observers
- Limited storage of review results (per-PR basis)
- Background service remains lightweight