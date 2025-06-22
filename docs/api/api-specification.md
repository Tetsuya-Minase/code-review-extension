# API仕様書

## 1. 概要

Code Review AI ExtensionはChrome拡張機能として動作し、複数のAIプロバイダーと統合してコードレビュー機能を提供します。本文書では、内部API（Chrome Extension API）と外部API（AI Provider APIs）の仕様を詳述します。

## 2. Chrome Extension 内部API

### 2.1 Message Passing API

#### 2.1.1 Content Script → Background Service

拡張機能内のコンポーネント間通信には Chrome Runtime Message Passing を使用します。

##### START_REVIEW

**説明**: レビュープロセスを開始する

**メッセージ形式**:
```typescript
interface StartReviewMessage {
  type: 'START_REVIEW';
  data: {
    prInfo: PullRequestInfo;
    config: ExtensionConfig;
  };
}

interface PullRequestInfo {
  owner: string;
  repo: string;
  number: number;
  diffUrl: string;
}
```

**レスポンス**:
```typescript
interface ReviewResponse {
  success: boolean;
  reviewId: string;
  error?: string;
}
```

**使用例**:
```typescript
chrome.runtime.sendMessage({
  type: 'START_REVIEW',
  data: {
    prInfo: {
      owner: 'facebook',
      repo: 'react',
      number: 12345,
      diffUrl: 'https://github.com/facebook/react/pull/12345/files'
    },
    config: extensionConfig
  }
}, (response) => {
  if (response.success) {
    console.log('レビュー開始:', response.reviewId);
  }
});
```

##### FETCH_PR_DIFF

**説明**: GitHub PR差分データを取得する（CORS回避）

**メッセージ形式**:
```typescript
interface FetchDiffMessage {
  type: 'FETCH_PR_DIFF';
  data: {
    diffUrl: string;
  };
}
```

**レスポンス**:
```typescript
interface DiffResponse {
  success: boolean;
  diff: string;
  error?: string;
}
```

#### 2.1.2 Background Service → Content Script

##### STEP_COMPLETED

**説明**: レビューステップ完了の通知

**メッセージ形式**:
```typescript
interface StepCompletedMessage {
  type: 'STEP_COMPLETED';
  data: {
    reviewId: string;
    stepId: string;
    stepName: string;
    progress: number; // 0-100
  };
}
```

##### REVIEW_COMPLETED

**説明**: 全レビュープロセス完了の通知

**メッセージ形式**:
```typescript
interface ReviewCompletedMessage {
  type: 'REVIEW_COMPLETED';
  data: {
    reviewId: string;
    result: string;
    timestamp: number;
  };
}
```

##### REVIEW_ERROR

**説明**: レビュープロセスエラーの通知

**メッセージ形式**:
```typescript
interface ReviewErrorMessage {
  type: 'REVIEW_ERROR';
  data: {
    reviewId: string;
    error: string;
    stepId?: string;
  };
}
```

### 2.2 Storage API

#### 2.2.1 設定データの保存・読み込み

```typescript
// 設定保存
chrome.storage.sync.set({
  extensionConfig: {
    selectedProvider: 'openai',
    providers: {
      openai: {
        apiKey: 'sk-...',
        model: 'gpt-4o'
      }
    },
    reviewSteps: [...]
  }
});

// 設定読み込み
chrome.storage.sync.get(['extensionConfig'], (result) => {
  const config = result.extensionConfig;
});
```

#### 2.2.2 レビュー結果の一時保存

```typescript
// 結果保存（ローカル）
chrome.storage.local.set({
  [`review_${prId}`]: {
    result: reviewContent,
    timestamp: Date.now()
  }
});

// 結果読み込み
chrome.storage.local.get([`review_${prId}`], (result) => {
  const reviewData = result[`review_${prId}`];
});
```

## 3. 外部AI Provider APIs

### 3.1 OpenAI API

#### 3.1.1 エンドポイント
- **Base URL**: `https://api.openai.com/v1/`
- **認証**: Bearer Token
- **Content-Type**: `application/json`

#### 3.1.2 Chat Completions API

**エンドポイント**: `POST /chat/completions`

**リクエストヘッダー**:
```http
Authorization: Bearer sk-...
Content-Type: application/json
```

**リクエストボディ**:
```typescript
interface OpenAIRequest {
  model: string; // 'gpt-4o' | 'o1-preview' | 'o1-mini' | 'gpt-4-turbo'
  messages: [
    {
      role: 'system';
      content: string; // レビューステップのプロンプト
    },
    {
      role: 'user';
      content: string; // diff + 前ステップ結果
    }
  ];
  max_tokens?: number;
  temperature?: number;
}
```

**レスポンス**:
```typescript
interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: [
    {
      index: number;
      message: {
        role: 'assistant';
        content: string;
      };
      finish_reason: string;
    }
  ];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### 3.2 Claude API

#### 3.2.1 エンドポイント
- **Base URL**: `https://api.anthropic.com/v1/`
- **認証**: API Key
- **Content-Type**: `application/json`

#### 3.2.2 Messages API

**エンドポイント**: `POST /messages`

**リクエストヘッダー**:
```http
x-api-key: sk-ant-...
anthropic-version: 2023-06-01
anthropic-dangerous-direct-browser-access: true
Content-Type: application/json
```

**リクエストボディ**:
```typescript
interface ClaudeRequest {
  model: string; // 'claude-4-sonnet' | 'claude-4-opus' | 'claude-3.7-sonnet'
  max_tokens: number;
  system: string; // システムプロンプト
  messages: [
    {
      role: 'user';
      content: string; // diff + 前ステップ結果
    }
  ];
}
```

**レスポンス**:
```typescript
interface ClaudeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: [
    {
      type: 'text';
      text: string;
    }
  ];
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

### 3.3 Gemini API

#### 3.3.1 エンドポイント
- **Base URL**: `https://generativelanguage.googleapis.com/v1beta/`
- **認証**: API Key (query parameter)
- **Content-Type**: `application/json`

#### 3.3.2 Generate Content API

**エンドポイント**: `POST /models/{model}:generateContent?key={API_KEY}`

**リクエストボディ**:
```typescript
interface GeminiRequest {
  contents: [
    {
      parts: [
        {
          text: string; // システムプロンプト + diff + 前ステップ結果
        }
      ];
    }
  ];
  generationConfig: {
    maxOutputTokens: number;
    temperature?: number;
  };
}
```

**レスポンス**:
```typescript
interface GeminiResponse {
  candidates: [
    {
      content: {
        parts: [
          {
            text: string;
          }
        ];
        role: 'model';
      };
      finishReason: string;
      index: number;
      safetyRatings: Array<{
        category: string;
        probability: string;
      }>;
    }
  ];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}
```

### 3.4 OpenAI Compatible API

#### 3.4.1 エンドポイント
- **Base URL**: カスタム設定可能（例: `http://localhost:11434/v1/`）
- **認証**: Bearer Token または API Key
- **Content-Type**: `application/json`

#### 3.4.2 Chat Completions API（OpenAI互換）

**エンドポイント**: `POST /chat/completions`

OpenAI APIと同じフォーマットを使用しますが、ベースURLが異なります。

## 4. GitHub API

### 4.1 Diff取得API

#### 4.1.1 エンドポイント

**URL**: `https://github.com/{owner}/{repo}/pull/{number}.diff`
**メソッド**: GET
**認証**: ブラウザのGitHubセッション（継承）

**レスポンス形式**: Unified Diff Format

```diff
diff --git a/src/component.ts b/src/component.ts
index 1234567..abcdefg 100644
--- a/src/component.ts
+++ b/src/component.ts
@@ -10,7 +10,8 @@ export class Component {
   constructor() {
-    this.value = 0;
+    this.value = 10;
+    this.initialized = true;
   }
 }
```

## 5. エラーコードとハンドリング

### 5.1 Chrome Extension エラー

| エラーコード | 説明 | 対処方法 |
|-------------|------|----------|
| `INVALID_CONFIG` | 設定データが不正 | 設定をリセットして再設定 |
| `STORAGE_ERROR` | ストレージアクセスエラー | Chrome再起動またはストレージクリア |
| `MESSAGE_TIMEOUT` | メッセージ通信タイムアウト | ページ再読み込み |
| `PR_INFO_EXTRACT_FAILED` | PR情報抽出失敗 | URLまたはページ構造確認 |

### 5.2 AI Provider エラー

#### 5.2.1 OpenAI エラー

| HTTPステータス | エラーコード | 説明 | 対処方法 |
|---------------|-------------|------|----------|
| 401 | `invalid_api_key` | 無効なAPIキー | APIキーを確認・更新 |
| 429 | `rate_limit_exceeded` | レート制限 | 時間をおいて再試行 |
| 400 | `invalid_request` | リクエスト形式エラー | パラメータを確認 |

#### 5.2.2 Claude エラー

| HTTPステータス | エラーコード | 説明 | 対処方法 |
|---------------|-------------|------|----------|
| 401 | `authentication_error` | 認証エラー | APIキーを確認 |
| 429 | `rate_limit_error` | レート制限 | 時間をおいて再試行 |
| 400 | `invalid_request_error` | 無効なリクエスト | パラメータを確認 |

#### 5.2.3 Gemini エラー

| HTTPステータス | エラーコード | 説明 | 対処方法 |
|---------------|-------------|------|----------|
| 400 | `INVALID_ARGUMENT` | 無効な引数 | リクエストパラメータ確認 |
| 403 | `PERMISSION_DENIED` | 権限不足 | APIキーまたは権限確認 |
| 429 | `RESOURCE_EXHAUSTED` | レート制限 | 時間をおいて再試行 |

## 6. セキュリティ仕様

### 6.1 APIキー保護

#### 6.1.1 保存方式
- Chrome Storage Sync APIで自動暗号化
- ローカルストレージには平文保存しない
- 設定画面でのマスク表示

#### 6.1.2 検証方式

```typescript
interface APIKeyValidation {
  openai: (key: string) => key.startsWith('sk-') && key.length > 40;
  claude: (key: string) => key.startsWith('sk-ant-') && key.length > 50;
  gemini: (key: string) => key.startsWith('AIza') && key.length > 30;
  'openai-compatible': (key: string) => key.length > 0;
}
```

### 6.2 XSS防止

#### 6.2.1 HTML エスケープ

```typescript
private static escapeHtml(text: string): string {
  const escapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}
```

### 6.3 CORS対応

Background Serviceでプロキシ処理を実装：

```typescript
// Content Script
chrome.runtime.sendMessage({ type: 'FETCH_PR_DIFF', data: { diffUrl } });

// Background Service
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_PR_DIFF') {
    fetch(request.data.diffUrl)
      .then(response => response.text())
      .then(diff => sendResponse({ success: true, diff }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンス
  }
});
```

## 7. レート制限とタイムアウト

### 7.1 API制限

| Provider | レート制限 | 推奨間隔 |
|----------|-----------|----------|
| OpenAI | 10,000 RPM | 6ms |
| Claude | 1,000 RPM | 60ms |
| Gemini | 1,500 RPM | 40ms |
| OpenAI Compatible | プロバイダー依存 | 設定可能 |

### 7.2 タイムアウト設定

```typescript
interface TimeoutConfig {
  contentScript: 300000; // 5分
  apiRequest: 60000;     // 1分
  backgroundService: 600000; // 10分
}
```

## 8. APIバージョニング

### 8.1 外部API対応

| Provider | APIバージョン | サポート終了 |
|----------|-------------|-------------|
| OpenAI | v1 | なし |
| Claude | 2023-06-01 | 2024年以降順次 |
| Gemini | v1beta | 安定版移行後 |

### 8.2 内部API互換性

Chrome Extension内部APIは後方互換性を維持：

```typescript
// 設定マイグレーション例
interface ConfigMigration {
  from: '1.0.0';
  to: '2.0.0';
  migrate: (oldConfig: any) => ExtensionConfig;
}
```

## 9. 使用例とSDK

### 9.1 基本的なレビュー実行

```typescript
// Content Script側
const prInfo = GitHubService.extractPRInfo();
if (prInfo) {
  chrome.runtime.sendMessage({
    type: 'START_REVIEW',
    data: { prInfo, config: await getExtensionConfig() }
  }, (response) => {
    if (response.success) {
      showProgressIndicator(response.reviewId);
    }
  });
}

// Background Service側
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === 'START_REVIEW') {
    const reviewId = generateReviewId();
    processReview(request.data, reviewId, sender.tab.id);
    sendResponse({ success: true, reviewId });
  }
});
```

### 9.2 カスタムステップ実行

```typescript
const customSteps = [
  {
    id: 'security',
    name: 'セキュリティチェック',
    prompt: 'セキュリティ上の問題を特定してください',
    enabled: true,
    order: 1
  },
  {
    id: 'performance',
    name: 'パフォーマンス分析',
    prompt: 'パフォーマンスの改善点を提案してください',
    enabled: true,
    order: 2
  }
];

await executeReviewSteps(prDiff, customSteps);
```

このAPI仕様書により、開発者は拡張機能の内部動作と外部API連携を理解し、効率的な開発とトラブルシューティングが可能になります。