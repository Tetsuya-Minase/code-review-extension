# 技術仕様書

## 1. システムアーキテクチャ概要

### 1.1 アーキテクチャパターン

Code Review AI ExtensionはChrome拡張機能として設計され、**レイヤードアーキテクチャ**を採用しています。各レイヤーが明確に分離され、責任範囲が定義されています。

```
┌─────────────────────────────────────────────────────┐
│                プレゼンテーション層                   │
│  Content Script │ Options Page │ Popup Interface    │
├─────────────────────────────────────────────────────┤
│                ビジネスロジック層                     │
│  Background Service │ AI Client Factory │ GitHub Service │
├─────────────────────────────────────────────────────┤
│                データアクセス層                       │
│  Storage Service │ Chrome Storage API │ External APIs  │
└─────────────────────────────────────────────────────┘
```

### 1.2 コア設計パターン

#### 1.2.1 ファクトリーパターン（AIClientFactory）
複数のAIプロバイダー（OpenAI、Claude、Gemini、OpenAI Compatible）を統一インターフェースで管理：

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

#### 1.2.2 オブザーバーパターン（DOM Mutation Observer）
GitHubページの動的変更を監視してUIを適応：

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

#### 1.2.3 ストラテジーパターン（AI Provider Abstraction）
各プロバイダーが異なるAPI仕様を統一的に処理：

```typescript
abstract class BaseAIClient {
  abstract executeReview(prompt: string, diffContent: string): Promise<string>;
}
```

## 2. コンポーネント設計

### 2.1 Background Service（background.ts）

**役割**: Service Workerとして動作し、APIコミュニケーションとCORS処理を担当

**主要機能**:
- 複数AIプロバイダーとの通信
- GitHub .diffエンドポイントのプロキシ処理
- 多段階レビュープロセスの調整
- タイムアウト管理（5分間）

**技術仕様**:
```typescript
interface ReviewRequest {
  prInfo: PullRequestInfo;
  config: ExtensionConfig;
  reviewSteps: ReviewStepConfig[];
}

interface ReviewResult {
  stepId: string;
  content: string;
  status: 'completed' | 'error';
  timestamp: number;
}
```

### 2.2 Content Script（content.ts）

**役割**: GitHubページにUI要素を注入し、ユーザーインタラクションを処理

**主要機能**:
- レビューボタンの動的挿入
- PR情報の抽出とパース
- 進行状況表示とアニメーション
- 結果表示の管理

**UI挿入戦略**:
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

### 2.3 Options Page（options.ts）

**役割**: 設定管理インターフェースを提供

**主要機能**:
- AIプロバイダー設定とAPIキー管理
- レビューステップのカスタマイズ
- 設定の保存・復元・マイグレーション
- リアルタイム検証とフィードバック

### 2.4 Utilities

#### 2.4.1 GitHubService（github.ts）
GitHub固有の処理とDOM操作を担当：

```typescript
interface PullRequestInfo {
  owner: string;
  repo: string;
  number: number;
  diffUrl: string;
}

class GitHubService {
  static extractPRInfo(): PullRequestInfo | null;
  static insertReviewButton(): void;
  static escapeHtml(text: string): string;
}
```

#### 2.4.2 StorageService（storage.ts）
Chrome Storage APIのラッパーとデータ管理：

```typescript
interface ExtensionConfig {
  selectedProvider: AIProvider;
  providers: {
    [K in AIProvider]: {
      apiKey: string;
      model: string;
      baseUrl?: string;
    };
  };
  reviewSteps: ReviewStepConfig[];
}
```

## 3. データフロー設計

### 3.1 メッセージパッシングアーキテクチャ

Chrome拡張機能のメッセージパッシングを使用したコンポーネント間通信：

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

### 3.2 CORS解決戦略

GitHub .diffエンドポイントへのアクセスでCORS制約を回避：

**問題**: Content ScriptはGitHubページのオリジンで実行されるため、外部ドメインへの直接アクセスが制限

**解決方法**:
1. Content Script → Background Serviceへメッセージ送信
2. Background Serviceでfetchリクエストをプロキシとして実行
3. 取得した差分データをContent Scriptに返送

```typescript
// Content Script側
chrome.runtime.sendMessage({ type: 'FETCH_PR_DIFF', data: prInfo }, callback);

// Background Service側
const response = await fetch(`https://github.com/${owner}/${repo}/pull/${number}.diff`);
```

## 4. セキュリティアーキテクチャ

### 4.1 データ保護戦略

#### 4.1.1 APIキー保護
```typescript
// Chrome Storage Sync APIでの暗号化保存
interface SecureStorage {
  providers: {
    [provider: string]: {
      apiKey: string; // 自動暗号化
      model: string;
    };
  };
}
```

#### 4.1.2 XSS防止
```typescript
private static escapeHtml(text: string): string {
  const escapeMap: { [key: string]: string } = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}
```

#### 4.1.3 入力検証
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

### 4.2 セキュリティモデル

- **Background Service**: 全ての外部API呼び出しをプロキシ
- **Content Script**: DOM操作のみに制限
- **データ暗号化**: Chrome Storage APIの内蔵暗号化
- **権限最小化**: manifest.jsonで必要最小限の権限のみ指定

## 5. パフォーマンス設計

### 5.1 ビルドシステム最適化

#### 5.1.1 Multi-Configuration Vite Setup
各コンポーネント向けに最適化されたビルド設定：

```typescript
// vite.config.content.ts - Content Script用
// vite.config.background.ts - Service Worker用  
// vite.config.options.ts - Options Page用
// vite.config.popup.ts - Popup用
```

#### 5.1.2 静的アセットパイプライン
```typescript
// build.mts による協調処理:
1. dist ディレクトリのクリーンアップ
2. 全設定での順次ビルド
3. 静的ファイル（HTML、CSS、manifest、icons）のコピー
4. ビルド出力の検証
```

### 5.2 実行時最適化

#### 5.2.1 リソース管理
- **Lazy Loading**: AIクライアントの遅延初期化
- **イミュータブルデータ**: メモリリーク防止
- **効率的セレクタ**: フォールバック機能付きDOM操作
- **キャッシュ戦略**: 設定・結果の適切なキャッシュ

#### 5.2.2 バンドル最適化
- **Tree-shaking**: 未使用コードの除去
- **Code Splitting**: 必要最小限のバンドル
- **ES Modules**: モダンブラウザ対応

## 6. AIプロバイダー統合仕様

### 6.1 OpenAI統合

**API形式**: OpenAI Chat Completions API
```typescript
interface OpenAIRequest {
  model: string;
  messages: [
    { role: 'system', content: string },
    { role: 'user', content: string }
  ];
}
```

### 6.2 Claude統合

**API形式**: Anthropic Messages API
**特記事項**: CORS対応のため`anthropic-dangerous-direct-browser-access`ヘッダーを追加

```typescript
interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: [
    { role: 'user', content: string }
  ];
  system: string;
}
```

### 6.3 Gemini統合

**API形式**: Google Generative Language API
**特記事項**: system promptとuser promptを結合して送信

```typescript
interface GeminiRequest {
  contents: [{
    parts: [{ text: string }]
  }];
  generationConfig: {
    maxOutputTokens: number;
  };
}
```

### 6.4 OpenAI Compatible統合

**API形式**: OpenAI Chat Completions API互換
**特記事項**: カスタムベースURL設定が必要

## 7. エラーハンドリング設計

### 7.1 優雅な劣化戦略

```typescript
interface ErrorHandlingStrategy {
  // 個別ステップ失敗時も全体プロセスを継続
  stepFailureHandling: 'continue' | 'abort';
  
  // ネットワークエラー時の再試行
  retryStrategy: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
  
  // タイムアウト管理
  timeoutHandling: {
    contentScript: 300000; // 5分
    apiRequest: 60000;     // 1分
  };
}
```

### 7.2 フォールバック機能

- **UI挿入**: 複数セレクタでのフォールバック
- **通信**: タブID追跡による確実なメッセージ配信
- **設定**: 自動マイグレーションとデフォルト復元

## 8. テストアーキテクチャ

### 8.1 テスト戦略

**TDD実装**: すべての機能でテスト先行開発
- **カバレッジ目標**: 80%ステートメント、70%ブランチ
- **現在のカバレッジ**: 13.22%（改善対象）

### 8.2 テスト構成

```typescript
// Jest設定（jest.config.js）
module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  }
};
```

### 8.3 テストパターン

**AAA (Arrange-Act-Assert) パターン**:
```typescript
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

## 9. 依存関係管理

### 9.1 外部依存関係

| パッケージ | バージョン | 用途 | 重要度 |
|-----------|-----------|------|--------|
| TypeScript | 5.3.3 | 型安全性とコンパイル | 高 |
| Vite | 5.0.10 | ビルドツール | 高 |
| Jest | 29.7.0 | テストフレームワーク | 高 |
| @types/chrome | 0.0.251 | Chrome API型定義 | 高 |
| ESLint | 8.56.0 | 静的解析 | 中 |
| tsx | 4.20.3 | TypeScript実行環境 | 中 |
| zx | 8.5.5 | ビルドスクリプト | 中 |

### 9.2 内部モジュール依存関係

```
types/index.ts ←── 全モジュール (中央集権型定義)
    ↑
    ├── utils/storage.ts ←── options/, popup/, background/
    ├── utils/github.ts ←── content/
    ├── utils/api.ts ←── background/
    └── background/ ←── content/ (Chrome message passing経由)
```

## 10. デプロイメント仕様

### 10.1 ビルドプロセス

```bash
# 開発用ビルド
npm run dev     # 監視モード

# 本番用ビルド
npm run build   # 最適化ビルド

# 品質チェック
npm run lint    # ESLint実行
npm test        # Jest実行
```

### 10.2 配布形式

**Chrome Web Store配布**:
- `dist/`フォルダをZIPアーカイブ
- manifest.jsonのバージョン管理
- アイコンとアセットの最適化

**開発者配布**:
- 未パッケージ拡張機能として`dist/`フォルダを直接読み込み

## 11. 監視とログ

### 11.1 エラー監視

```typescript
interface ErrorLogging {
  // 本番環境でのエラー追跡（個人情報除外）
  errorTracking: {
    anonymizeData: true;
    includeStackTrace: false;
    logLevel: 'error' | 'warn';
  };
}
```

### 11.2 パフォーマンス監視

- バンドルサイズ追跡
- API応答時間測定
- メモリ使用量監視
- ユーザーエラー率追跡

この技術仕様書は、Code Review AI Extensionの技術的実装詳細を包括的にカバーし、開発チームが効率的に作業できる基盤を提供します。