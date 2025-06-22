# テスト仕様書

## 1. テスト戦略概要

### 1.1 テスト方針

Code Review AI Extensionは **TDD（テスト駆動開発）** を採用し、高品質で信頼性の高いコードを維持します。全ての機能に対してテストを先行実装し、継続的な品質保証を実現します。

### 1.2 テスト目標

| 指標 | 目標値 | 現在値 | 改善計画 |
|------|--------|--------|----------|
| ステートメントカバレッジ | 80% | 13.22% | 段階的に向上 |
| ブランチカバレッジ | 70% | - | テスト追加 |
| 関数カバレッジ | 80% | - | 関数テスト強化 |
| 行カバレッジ | 80% | - | 総合的向上 |

### 1.3 テストピラミッド

```
         ┌─────────────────┐
         │   E2E Tests     │  ← 少数・重要フロー
         │   (Manual)      │
         └─────────────────┘
       ┌───────────────────────┐
       │  Integration Tests    │  ← 中程度・コンポーネント間
       │    (Jest + jsdom)     │
       └───────────────────────┘
     ┌─────────────────────────────┐
     │      Unit Tests             │  ← 多数・個別機能
     │     (Jest + Mocks)          │
     └─────────────────────────────┘
```

## 2. テスト環境設定

### 2.1 テストフレームワーク

**Jest** を使用し、Chrome拡張機能に最適化された設定を適用：

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,js}'
  ]
};
```

### 2.2 テスト実行環境

```bash
# 全テスト実行
npm test

# ウォッチモード（開発用）
npm run test:watch

# カバレッジレポート生成
npm run test:coverage

# 特定ファイルのテスト
npm test github.test.ts
```

### 2.3 モック設定

Chrome Extension API のモック設定：

```typescript
// tests/setup.ts
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};
```

## 3. ユニットテスト仕様

### 3.1 テスト設計パターン

**AAA (Arrange-Act-Assert) パターン**を一貫して使用：

```typescript
describe('機能名', () => {
  it('期待される動作の説明', () => {
    // Arrange: テストデータとモックの準備
    const mockData = { /* ... */ };
    jest.spyOn(service, 'method').mockReturnValue(mockData);

    // Act: テスト対象の実行
    const result = targetFunction(input);

    // Assert: 結果の検証
    expect(result).toEqual(expectedOutput);
    expect(service.method).toHaveBeenCalledWith(expectedInput);
  });
});
```

### 3.2 GitHubService テスト

#### 3.2.1 PR情報抽出テスト

```typescript
// tests/utils/github.test.ts
describe('GitHubService.extractPRInfo', () => {
  beforeEach(() => {
    // DOM をクリーンアップ
    document.body.innerHTML = '';
  });

  it('should extract PR information from valid URL', () => {
    // Arrange
    Object.defineProperty(window, 'location', {
      value: { pathname: '/facebook/react/pull/12345' }
    });

    // Act
    const result = GitHubService.extractPRInfo();

    // Assert
    expect(result).toEqual({
      owner: 'facebook',
      repo: 'react',
      number: 12345,
      diffUrl: 'https://github.com/facebook/react/pull/12345/files'
    });
  });

  it('should return null for invalid URL', () => {
    // Arrange
    Object.defineProperty(window, 'location', {
      value: { pathname: '/invalid/path' }
    });

    // Act
    const result = GitHubService.extractPRInfo();

    // Assert
    expect(result).toBeNull();
  });

  it('should handle enterprise GitHub URLs', () => {
    // Arrange
    Object.defineProperty(window, 'location', {
      value: { 
        hostname: 'github.company.com',
        pathname: '/team/project/pull/456'
      }
    });

    // Act
    const result = GitHubService.extractPRInfo();

    // Assert
    expect(result?.owner).toBe('team');
    expect(result?.repo).toBe('project');
    expect(result?.number).toBe(456);
  });
});
```

#### 3.2.2 UIボタン挿入テスト

```typescript
describe('GitHubService.insertReviewButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should insert review button in primary selector', () => {
    // Arrange
    document.body.innerHTML = '<div class="gh-header-actions"></div>';

    // Act
    GitHubService.insertReviewButton();

    // Assert
    const button = document.querySelector('.code-review-ai-button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toBe('レビュー');
  });

  it('should use fallback selector when primary fails', () => {
    // Arrange
    document.body.innerHTML = '<div class="gh-header-meta"></div>';

    // Act
    GitHubService.insertReviewButton();

    // Assert
    const button = document.querySelector('.code-review-ai-button');
    expect(button).toBeTruthy();
  });

  it('should create floating button when all selectors fail', () => {
    // Arrange
    document.body.innerHTML = '<div class="application-main"></div>';

    // Act
    GitHubService.insertReviewButton();

    // Assert
    const button = document.querySelector('.code-review-ai-button');
    expect(button).toBeTruthy();
    expect(button?.style.position).toBe('fixed');
  });
});
```

### 3.3 AIClientFactory テスト

```typescript
// tests/utils/api.test.ts
describe('AIClientFactory', () => {
  describe('createClient', () => {
    it('should create OpenAI client correctly', () => {
      // Arrange
      const apiKey = 'sk-test-key';
      const model = 'gpt-4o';

      // Act
      const client = AIClientFactory.createClient('openai', apiKey, model);

      // Assert
      expect(client).toBeInstanceOf(OpenAIClient);
      expect(client.apiKey).toBe(apiKey);
      expect(client.model).toBe(model);
    });

    it('should create Claude client with correct headers', () => {
      // Arrange
      const apiKey = 'sk-ant-test-key';
      const model = 'claude-4-sonnet';

      // Act
      const client = AIClientFactory.createClient('claude', apiKey, model);

      // Assert
      expect(client).toBeInstanceOf(ClaudeClient);
      expect(client.headers).toEqual({
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json'
      });
    });

    it('should throw error for unsupported provider', () => {
      // Arrange
      const invalidProvider = 'unknown' as any;

      // Act & Assert
      expect(() => {
        AIClientFactory.createClient(invalidProvider, 'key', 'model');
      }).toThrow('Unsupported AI provider: unknown');
    });
  });
});
```

### 3.4 StorageService テスト

```typescript
// tests/utils/storage.test.ts
describe('StorageService', () => {
  let mockChrome: any;

  beforeEach(() => {
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        },
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;
  });

  describe('saveConfig', () => {
    it('should save configuration to sync storage', async () => {
      // Arrange
      const config: ExtensionConfig = {
        selectedProvider: 'openai',
        providers: {
          openai: { apiKey: 'sk-test', model: 'gpt-4o' }
        },
        reviewSteps: []
      };

      mockChrome.storage.sync.set.mockImplementation((data, callback) => {
        callback();
      });

      // Act
      await StorageService.saveConfig(config);

      // Assert
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        { extensionConfig: config },
        expect.any(Function)
      );
    });
  });

  describe('loadConfig', () => {
    it('should load configuration from sync storage', async () => {
      // Arrange
      const storedConfig = { selectedProvider: 'claude' };
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({ extensionConfig: storedConfig });
      });

      // Act
      const result = await StorageService.loadConfig();

      // Assert
      expect(result).toEqual(storedConfig);
      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(
        ['extensionConfig'],
        expect.any(Function)
      );
    });

    it('should return default config when none exists', async () => {
      // Arrange
      mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
        callback({});
      });

      // Act
      const result = await StorageService.loadConfig();

      // Assert
      expect(result).toEqual(StorageService.getDefaultConfig());
    });
  });
});
```

## 4. 統合テスト仕様

### 4.1 メッセージパッシングテスト

```typescript
// tests/integration/message-passing.test.ts
describe('Message Passing Integration', () => {
  let backgroundService: any;
  let contentScript: any;

  beforeEach(() => {
    // Background Service と Content Script のモック初期化
    backgroundService = new BackgroundService();
    contentScript = new ContentScript();
  });

  it('should handle START_REVIEW message flow', async () => {
    // Arrange
    const prInfo = {
      owner: 'test',
      repo: 'repo',
      number: 123,
      diffUrl: 'https://github.com/test/repo/pull/123.diff'
    };

    const mockResponse = { success: true, reviewId: 'review-123' };
    jest.spyOn(backgroundService, 'handleStartReview')
        .mockResolvedValue(mockResponse);

    // Act
    const result = await contentScript.startReview(prInfo);

    // Assert
    expect(result).toEqual(mockResponse);
    expect(backgroundService.handleStartReview).toHaveBeenCalledWith(prInfo);
  });

  it('should handle REVIEW_COMPLETED message flow', async () => {
    // Arrange
    const reviewResult = {
      reviewId: 'review-123',
      result: 'レビュー完了',
      timestamp: Date.now()
    };

    const displaySpy = jest.spyOn(contentScript, 'displayReviewResult');

    // Act
    backgroundService.sendReviewCompleted(reviewResult);

    // Assert
    expect(displaySpy).toHaveBeenCalledWith(reviewResult.result);
  });
});
```

### 4.2 AI Provider統合テスト

```typescript
// tests/integration/ai-providers.test.ts
describe('AI Provider Integration', () => {
  describe('OpenAI Integration', () => {
    it('should execute review with OpenAI API', async () => {
      // Arrange
      const client = new OpenAIClient('sk-test-key', 'gpt-4o');
      const prompt = 'コードをレビューしてください';
      const diff = 'diff content...';

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'レビュー結果' } }]
        })
      });

      // Act
      const result = await client.executeReview(prompt, diff);

      // Assert
      expect(result).toBe('レビュー結果');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key'
          })
        })
      );
    });
  });

  describe('Claude Integration', () => {
    it('should handle Claude API response correctly', async () => {
      // Arrange
      const client = new ClaudeClient('sk-ant-test', 'claude-4-sonnet');
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: 'Claude レビュー結果' }]
        })
      });

      // Act
      const result = await client.executeReview('prompt', 'diff');

      // Assert
      expect(result).toBe('Claude レビュー結果');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          headers: expect.objectContaining({
            'anthropic-dangerous-direct-browser-access': 'true'
          })
        })
      );
    });
  });
});
```

## 5. エンドツーエンド（E2E）テスト仕様

### 5.1 手動E2Eテストケース

#### 5.1.1 基本レビューフロー

**テストケース**: TC-E2E-001  
**目的**: 基本的なレビューフローの動作確認

**前提条件**:
- Chrome拡張機能がインストール済み
- 有効なAPIキーが設定済み
- GitHubにアクセス可能

**テスト手順**:
1. GitHub PRページを開く
2. 「レビュー」ボタンがPRタイトル横に表示されることを確認
3. レビューボタンをクリック
4. 進行状況インジケーターが表示されることを確認
5. 各ステップの完了通知が表示されることを確認
6. 最終レビュー結果が右サイドバーに表示されることを確認

**期待結果**:
- 全ステップが正常に実行される
- レビュー結果がMarkdown形式で表示される
- エラーが発生しない

#### 5.1.2 設定変更テスト

**テストケース**: TC-E2E-002  
**目的**: 設定変更の動作確認

**テスト手順**:
1. 拡張機能のオプションページを開く
2. AIプロバイダーを変更
3. APIキーを更新
4. レビューステップを追加・削除
5. 設定を保存
6. PRページでレビューを実行

**期待結果**:
- 設定変更が正しく保存される
- 新しい設定でレビューが実行される

#### 5.1.3 エラーハンドリングテスト

**テストケース**: TC-E2E-003  
**目的**: エラー処理の動作確認

**テスト手順**:
1. 無効なAPIキーを設定
2. レビューを実行
3. エラーメッセージの表示を確認
4. ネットワークを切断してレビュー実行
5. タイムアウトエラーの処理を確認

**期待結果**:
- 適切なエラーメッセージが表示される
- アプリケーションがクラッシュしない

### 5.2 自動E2Eテスト（将来実装）

Puppeteerを使用した自動E2Eテストの実装計画：

```typescript
// tests/e2e/review-flow.e2e.ts (実装予定)
describe('E2E: Review Flow', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--load-extension=./dist']
    });
    page = await browser.newPage();
  });

  it('should complete review flow end-to-end', async () => {
    // GitHub PR ページに移動
    await page.goto('https://github.com/test/repo/pull/123');
    
    // レビューボタンの表示を待機
    await page.waitForSelector('.code-review-ai-button');
    
    // レビューボタンをクリック
    await page.click('.code-review-ai-button');
    
    // 結果の表示を待機
    await page.waitForSelector('.review-result', { timeout: 300000 });
    
    // 結果の内容を検証
    const resultText = await page.$eval('.review-result', el => el.textContent);
    expect(resultText).toContain('レビュー結果');
  });
});
```

## 6. パフォーマンステスト仕様

### 6.1 レスポンス時間テスト

```typescript
// tests/performance/response-time.test.ts
describe('Performance Tests', () => {
  it('should complete review within acceptable time', async () => {
    // Arrange
    const startTime = performance.now();
    const mockDiff = 'diff content...';

    // Act
    await reviewService.executeReview(mockDiff);
    const endTime = performance.now();

    // Assert
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(300000); // 5分以内
  });

  it('should inject UI elements quickly', async () => {
    // Arrange
    const startTime = performance.now();

    // Act
    GitHubService.insertReviewButton();
    const endTime = performance.now();

    // Assert
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(1000); // 1秒以内
  });
});
```

### 6.2 メモリ使用量テスト

```typescript
describe('Memory Usage Tests', () => {
  it('should not exceed memory limits', async () => {
    // Arrange
    const initialMemory = performance.memory?.usedJSHeapSize || 0;

    // Act
    for (let i = 0; i < 100; i++) {
      await reviewService.executeReview('test diff');
    }

    // Assert
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以内
  });
});
```

## 7. セキュリティテスト仕様

### 7.1 XSS防止テスト

```typescript
// tests/security/xss-prevention.test.ts
describe('XSS Prevention Tests', () => {
  it('should escape HTML in review results', () => {
    // Arrange
    const maliciousInput = '<script>alert("XSS")</script>';

    // Act
    const escaped = GitHubService.escapeHtml(maliciousInput);

    // Assert
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    expect(escaped).not.toContain('<script>');
  });

  it('should not execute injected scripts in results', () => {
    // Arrange
    const maliciousResult = '<img src="x" onerror="alert(1)">';
    document.body.innerHTML = '<div class="review-result"></div>';

    // Act
    const resultDiv = document.querySelector('.review-result');
    resultDiv!.textContent = maliciousResult;

    // Assert
    expect(resultDiv!.innerHTML).not.toContain('onerror');
  });
});
```

### 7.2 APIキー保護テスト

```typescript
describe('API Key Security Tests', () => {
  it('should not log API keys', () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'log');
    const apiKey = 'sk-secret-key';

    // Act
    openAIClient.setApiKey(apiKey);

    // Assert
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining(apiKey)
    );
  });

  it('should validate API key format', () => {
    // Arrange
    const invalidKey = 'invalid-key';

    // Act & Assert
    expect(() => {
      openAIClient.setApiKey(invalidKey);
    }).toThrow('Invalid API key format');
  });
});
```

## 8. テスト実行とレポート

### 8.1 継続的インテグレーション

```yaml
# .github/workflows/test.yml (実装予定)
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run lint
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
        with:
          file: ./coverage/lcov.info
```

### 8.2 カバレッジレポート

```bash
# カバレッジレポート生成
npm run test:coverage

# HTMLレポートの確認
open coverage/lcov-report/index.html

# カバレッジ閾値チェック
npm test -- --coverage --coverageThreshold='{"global":{"statements":80}}'
```

### 8.3 テスト結果の可視化

```typescript
// tests/reporters/custom-reporter.ts
class CustomTestReporter {
  onRunComplete(contexts: any, results: any) {
    console.log(`
テスト実行結果:
- 実行テスト数: ${results.numTotalTests}
- 成功: ${results.numPassedTests}
- 失敗: ${results.numFailedTests}
- カバレッジ: ${results.coverageMap?.getCoverageSummary()?.statements.pct}%
    `);
  }
}
```

## 9. テスト保守とベストプラクティス

### 9.1 テストの保守性

- **一つのテストに一つの責任**: 各テストは単一の機能のみを検証
- **説明的なテスト名**: テストの目的が明確にわかる命名
- **適切なセットアップとクリーンアップ**: テスト間の独立性を保証
- **モックの適切な使用**: 外部依存を分離して高速実行

### 9.2 テストデータ管理

```typescript
// tests/fixtures/test-data.ts
export const TEST_PR_INFO = {
  valid: {
    owner: 'facebook',
    repo: 'react',
    number: 12345,
    diffUrl: 'https://github.com/facebook/react/pull/12345.diff'
  },
  invalid: {
    owner: '',
    repo: '',
    number: 0,
    diffUrl: ''
  }
};

export const MOCK_DIFF_CONTENT = `
diff --git a/src/test.ts b/src/test.ts
index 1234567..abcdefg 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
 export function test() {
+  console.log('test');
   return true;
 }
`;
```

このテスト仕様書により、開発チームは体系的で効率的なテスト戦略を実行し、高品質なCode Review AI Extensionを維持できます。