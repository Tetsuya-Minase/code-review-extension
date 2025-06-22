# 開発者ガイド

## 1. 開発環境の構築

### 1.1 前提条件

- **Node.js**: バージョン 16 以上
- **Chrome ブラウザ**: 最新版推奨
- **Git**: バージョン管理用

### 1.2 初期セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-username/code-review-extension.git
cd code-review-extension

# 依存関係のインストール
npm install

# 開発用ビルド（監視モード）
npm run dev

# 本番用ビルド
npm run build
```

### 1.3 Chrome拡張機能の読み込み

1. Chrome拡張機能管理ページを開く: `chrome://extensions/`
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトの`dist`フォルダを選択

## 2. プロジェクト構造の理解

### 2.1 ディレクトリ構造

```
code-review-extension/
├── .claude/                    # Claude Code設定
│   ├── commands/              # カスタムコマンド
│   └── settings.local.json    # ローカル設定
├── src/                       # ソースコード
│   ├── background/            # Service Worker
│   │   └── background.ts      # バックグラウンド処理
│   ├── content/               # Content Script
│   │   ├── content.ts         # GitHub DOM操作
│   │   └── styles.css         # UI スタイル
│   ├── options/               # 設定画面
│   │   ├── options.ts         # 設定ロジック
│   │   ├── options.html       # 設定UI
│   │   └── options.css        # 設定スタイル
│   ├── popup/                 # ポップアップ
│   │   ├── popup.ts           # ポップアップロジック
│   │   ├── popup.html         # ポップアップUI
│   │   └── popup.css          # ポップアップスタイル
│   ├── types/                 # 型定義
│   │   └── index.ts           # 共通型定義
│   └── utils/                 # ユーティリティ
│       ├── api.ts             # AI API クライアント
│       ├── github.ts          # GitHub 操作
│       └── storage.ts         # ストレージ管理
├── tests/                     # テストファイル
│   ├── background.build.test.ts
│   └── utils/
│       └── github.test.ts
├── docs/                      # プロジェクトドキュメント
├── dist/                      # ビルド出力
├── assets/                    # 静的アセット
├── build.mts                  # ビルドスクリプト
├── manifest.json              # 拡張機能マニフェスト
└── vite.config.*.ts          # Vite設定ファイル
```

### 2.2 主要ファイルの役割

#### 2.2.1 Background Service (`src/background/background.ts`)
- Service Workerとして動作
- AI APIとの通信を担当
- CORS問題の解決（GitHub .diff API プロキシ）
- レビュープロセスの調整

#### 2.2.2 Content Script (`src/content/content.ts`)
- GitHubページに直接注入される
- レビューボタンの配置
- ユーザーインタラクションの処理
- 結果表示の管理

#### 2.2.3 Options Page (`src/options/`)
- 拡張機能の設定インターフェース
- AIプロバイダーとAPIキーの管理
- レビューステップのカスタマイズ

## 3. 開発ワークフロー

### 3.1 TDD（テスト駆動開発）プロセス

本プロジェクトはTDD原則に従って開発されています：

```bash
# 1. Red: 失敗するテストを先に書く
npm test -- --watch

# 2. Green: テストが通る最小限のコードを実装
npm run dev

# 3. Refactor: コードを改善
npm run lint
npm run lint:fix
```

### 3.2 コーディング規約

#### 3.2.1 TypeScript 規約

```typescript
// ✅ Good: 厳密な型定義
interface PullRequestInfo {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
  readonly diffUrl: string;
}

// ✅ Good: イミュータブルデータパターン
const updateConfig = (config: ExtensionConfig, updates: Partial<ExtensionConfig>): ExtensionConfig => {
  return { ...config, ...updates };
};

// ❌ Bad: anyの使用
const processData = (data: any) => { /* ... */ };

// ❌ Bad: 直接的な変更
config.providers.openai.apiKey = newKey;
```

#### 3.2.2 ネーミング規約

```typescript
// ファイル名: kebab-case
// review-button.ts, api-client.ts

// 関数・変数: camelCase
const extractPRInfo = () => { /* ... */ };
const isValidApiKey = true;

// クラス・インターフェース: PascalCase
class GitHubService { /* ... */ }
interface ReviewRequest { /* ... */ }

// 定数: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT = 300000;
const API_ENDPOINTS = { /* ... */ };
```

#### 3.2.3 コメント規約

```typescript
/**
 * GitHubのPR情報を抽出する
 * @param url - PR ページのURL
 * @returns PR情報オブジェクト、解析失敗時はnull
 */
public static extractPRInfo(url?: string): PullRequestInfo | null {
  // 実装詳細...
}
```

### 3.3 Git ワークフロー

#### 3.3.1 ブランチ戦略

```bash
# 機能開発
git checkout -b feature/add-new-provider
git commit -m "feat(providers): add support for new AI provider"

# バグ修正
git checkout -b fix/button-placement-issue
git commit -m "fix(ui): resolve button placement in GitHub enterprise"

# ドキュメント更新
git checkout -b docs/update-api-guide
git commit -m "docs(api): update authentication examples"
```

#### 3.3.2 コミットメッセージ規約

**Conventional Commits**形式を使用：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**例**:
```bash
feat(providers): add Claude 4 support

- Add Claude 4 Sonnet and Opus models
- Implement anthropic-dangerous-direct-browser-access header
- Update provider selection UI

Closes #123
```

### 3.4 品質保証プロセス

#### 3.4.1 自動化されたチェック

```bash
# すべての品質チェックを実行
npm run build    # ビルドエラーのチェック
npm run lint     # ESLint静的解析
npm test         # ユニットテスト実行
npm run test:coverage  # カバレッジレポート
```

#### 3.4.2 手動テスト手順

1. **設定画面テスト**
   - 各AIプロバイダーの設定保存・読み込み
   - APIキー検証の動作確認
   - レビューステップの追加・削除・並び替え

2. **GitHub統合テスト**
   - PR/差分ページでのボタン表示確認
   - レビュー実行とプログレス表示
   - 結果表示の確認

3. **エラーハンドリングテスト**
   - 無効なAPIキーでの動作
   - ネットワークエラー時の動作
   - タイムアウト時の動作

## 4. デバッグとトラブルシューティング

### 4.1 開発ツールの活用

#### 4.1.1 Chrome DevTools

```javascript
// Background Service のデバッグ
// chrome://extensions/ → 拡張機能詳細 → "service worker" リンク

// Content Script のデバッグ
// GitHub ページで F12 → Console タブ

// Storage の確認
// DevTools → Application → Storage → Extension Storage
```

#### 4.1.2 ログ出力

```typescript
// 開発環境でのみログ出力
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  console.log('レビューボタンを挿入しました:', selector);
}
```

### 4.2 よくある問題と解決方法

#### 4.2.1 レビューボタンが表示されない

**原因**: GitHub UI構造の変更
**解決方法**:
```typescript
// github.ts でセレクタの確認・追加
const selectors = [
  '.gh-header-actions',
  '.gh-header .gh-header-actions',
  '.timeline-comment-actions',
  // 新しいセレクタを追加
  '.new-github-ui-selector'
];
```

#### 4.2.2 Service Worker が動作しない

**原因**: Manifest V3 の制限
**解決方法**:
```json
// manifest.json の確認
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  }
}
```

#### 4.2.3 CORS エラー

**原因**: Content Script からの直接 API 呼び出し
**解決方法**:
```typescript
// Content Script → Background Service 経由で API 呼び出し
chrome.runtime.sendMessage({ type: 'API_REQUEST', data: requestData });
```

### 4.3 パフォーマンス最適化

#### 4.3.1 バンドルサイズの確認

```bash
# ビルド後のファイルサイズ確認
npm run build
ls -la dist/

# 推奨サイズ:
# - content.js: < 15KB (gzipped)
# - background.js: < 20KB (gzipped)
# - options.js: < 15KB (gzipped)
```

#### 4.3.2 メモリ使用量の監視

```typescript
// メモリ使用量のログ出力（開発環境のみ）
if (isDevelopment) {
  setInterval(() => {
    console.log('Memory usage:', performance.memory);
  }, 30000);
}
```

## 5. テスト戦略

### 5.1 テスト環境の設定

```bash
# テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

### 5.2 テストの書き方

#### 5.2.1 ユニットテスト例

```typescript
// tests/utils/github.test.ts
describe('GitHubService', () => {
  describe('extractPRInfo', () => {
    it('should extract PR information correctly', () => {
      // Arrange
      const mockUrl = '/owner/repo/pull/123';
      Object.defineProperty(window, 'location', {
        value: { pathname: mockUrl }
      });

      // Act
      const result = GitHubService.extractPRInfo();

      // Assert
      expect(result).toEqual({
        owner: 'owner',
        repo: 'repo',
        number: 123,
        diffUrl: 'https://github.com/owner/repo/pull/123/files'
      });
    });
  });
});
```

#### 5.2.2 DOM テスト例

```typescript
// Content Script のテスト
describe('Review Button Injection', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="gh-header-actions"></div>';
  });

  it('should inject review button', () => {
    // Act
    GitHubService.insertReviewButton();

    // Assert
    const button = document.querySelector('.code-review-ai-button');
    expect(button).toBeTruthy();
    expect(button?.textContent).toBe('レビュー');
  });
});
```

### 5.3 テストカバレッジ目標

- **ステートメント**: 80%以上
- **ブランチ**: 70%以上
- **関数**: 80%以上
- **行**: 80%以上

## 6. デプロイメント

### 6.1 開発版デプロイ

```bash
# 開発ビルド
npm run dev

# ファイル変更の監視が開始される
# Chrome で拡張機能を再読み込み: Ctrl+R on chrome://extensions/
```

### 6.2 本番版ビルド

```bash
# 本番ビルド
npm run build

# ビルド結果の確認
ls -la dist/

# 出力ファイル:
# - background.js (Service Worker)
# - content.js (Content Script)
# - options.js, options.html (設定画面)
# - popup.js, popup.html (ポップアップ)
# - manifest.json (拡張機能定義)
# - styles.css, *.css (スタイル)
# - assets/ (アイコンなど)
```

### 6.3 Chrome Web Store 用パッケージング

```bash
# dist フォルダを ZIP 形式でアーカイブ
cd dist
zip -r ../code-review-ai-extension.zip .
cd ..

# アップロード用ファイル: code-review-ai-extension.zip
```

## 7. 貢献ガイドライン

### 7.1 Issue の作成

新機能や改善提案の場合：
- 背景と動機を説明
- 期待される動作を詳述
- 可能であれば実装案を提示

バグレポートの場合：
- 再現手順を明記
- 期待される動作と実際の動作
- 環境情報（Chrome バージョン、OS など）

### 7.2 プルリクエストのガイドライン

1. **フォーク & ブランチ作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **変更の実装**
   - TDD プロセスに従う
   - コーディング規約を遵守
   - 適切なテストを追加

3. **コミット**
   ```bash
   git commit -m "feat(scope): description"
   ```

4. **プッシュ & PR作成**
   - 明確なタイトルと説明
   - 関連Issue への参照
   - スクリーンショット（UI変更の場合）

### 7.3 コードレビューの観点

- **機能性**: 要求通りに動作するか
- **セキュリティ**: XSS、APIキー漏洩の防止
- **パフォーマンス**: レスポンス時間、メモリ使用量
- **テスト**: 適切なテストカバレッジ
- **ドキュメント**: コメントとドキュメントの更新

## 8. チーム開発のベストプラクティス

### 8.1 コミュニケーション

- **Issue**: 機能追加・バグ報告・質問
- **PR**: コードレビュー・議論
- **Wiki**: 長期的なドキュメント
- **README**: プロジェクト概要・クイックスタート

### 8.2 知識共有

- **定期的なコードレビュー**: 知識伝播とバグ防止
- **ペアプログラミング**: 複雑な機能の実装時
- **技術文書**: アーキテクチャ決定の記録
- **デモ**: 新機能の共有

### 8.3 品質維持

- **自動テスト**: CI/CD パイプラインでの実行
- **静的解析**: ESLint、TypeScript strict mode
- **依存関係管理**: 定期的なアップデート
- **セキュリティ監査**: 脆弱性スキャン

このガイドに従うことで、Code Review AI Extension の開発に効率的に参加し、高品質なコードを維持できます。