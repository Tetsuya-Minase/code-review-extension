# Code Review AI

GitHubのコードレビューを支援するAIツール

## 概要

Code Review AIは、GitHub上のプルリクエストに対してAIを活用した自動コードレビューを提供するChrome拡張機能です。OpenAI、Claude、Gemini、OpenAI Compatible APIの4つのプロバイダーに対応し、3段階の詳細なレビューを実行します。

## 主な機能

- **設定機能**
  - 4つのAIプロバイダー（OpenAI、Claude、Gemini、OpenAI Compatible）への対応
  - 各プロバイダーのAPIキーとモデル設定
  - 3ステップのレビュープロンプトカスタマイズ
  - リアルタイムフィードバック付き設定保存
- **PRレビュー機能**
  - PRページに「レビュー」ボタンを追加
  - **任意の回数**の段階的なコードレビュー
    - ユーザーが自由にステップ数を設定可能（1ステップ～無制限）
    - 各ステップのプロンプトを個別にカスタマイズ
    - ステップの順序変更、追加、削除が可能
    - デフォルト3ステップ構成：
      - **Step 1**: 問題点の洗い出し、特にクリティカルな問題がないかを確認
      - **Step 2**: Step 1の結果とコード差分を元にコードレビューを実行
      - **Step 3**: Step 2の結果とコード差分を元に改善点を提案
  - レビュー結果の表示
    - PRページ: 右サイドバーに表示
    - 差分ページ（/files）: 左側ファイル一覧エリアの上部に表示
    - 表示形式: Markdown形式のテキストをそのまま表示
    - **最後のステップの結果のみ表示**（中間ステップは内部処理で使用）

## 技術仕様

### diff取得方法

PRの差分は以下のエンドポイントから取得します：
```
https://github.com/{owner}/{repo}/pull/{number}.diff
```

このエンドポイントは、unified diff形式でPRの全変更内容を返します。

### 実装の特徴

- **TDD（テスト駆動開発）**: すべての機能に対してテストを先に作成
- **TypeScript**: 型安全性を確保
- **セキュリティ**: XSS対策のためのHTMLエスケープ処理
- **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージと堅牢な通信処理
- **ストレージ管理**: Chrome Storage APIによる安全な設定保存
- **ユーザーエクスペリエンス**: リアルタイムフィードバックとアニメーション
- **通信の安定性**: タブ追跡による確実なメッセージ配信とタイムアウト処理

### CORS対応の実装

Chrome拡張機能のコンテンツスクリプトから直接 `.diff` エンドポイントにアクセスすると、CORSエラーが発生します。これは、コンテンツスクリプトが挿入されたページのオリジン（github.com）で実行されるため、別ドメイン（patch-diff.githubusercontent.com）へのリクエストがブロックされるためです。

**解決方法**：
1. コンテンツスクリプトからバックグラウンドスクリプトへメッセージを送信
2. バックグラウンドスクリプトで `.diff` エンドポイントにfetchリクエストを実行
3. 取得した差分データをコンテンツスクリプトに返送

この実装により、CORSの制約を回避して差分データを取得できます。

```javascript
// コンテンツスクリプト側
chrome.runtime.sendMessage({ type: 'FETCH_PR_DIFF', data: prInfo }, callback);

// バックグラウンドスクリプト側
const response = await fetch(`https://github.com/${owner}/${repo}/pull/${number}.diff`);
```

### AIプロバイダー対応

本拡張機能は以下のAIプロバイダーに対応しています：

#### OpenAI
- **対応モデル**: GPT-4o、O1-Preview、O1-Mini、GPT-4 Turbo
- **API形式**: OpenAI Chat Completions API
- **特記事項**: system/userメッセージ形式でプロンプトを分離

#### Claude (Anthropic)
- **対応モデル**: Claude 4 (Sonnet 4)、Claude 4 (Opus 4)、Claude 3.7 Sonnet
- **API形式**: Anthropic Messages API
- **特記事項**: `anthropic-dangerous-direct-browser-access`ヘッダーでCORS対応

#### Gemini (Google)
- **対応モデル**: Gemini 2.0 Flash Exp、Gemini 2.0 Flash、Gemini 1.5 Pro、Gemini 1.5 Flash
- **API形式**: Google Generative Language API
- **特記事項**: system promptとuser promptを結合して送信

#### OpenAI Compatible
- **対応**: Ollama、LM Studio、その他OpenAI互換API
- **API形式**: OpenAI Chat Completions API互換
- **特記事項**: カスタムベースURL設定が必要

### 設定管理とストレージ

拡張機能の設定は Chrome Storage API を使用して安全に管理されます：

**設定データの保存場所**:
- **chrome.storage.sync**: APIキーとレビューステップ設定（デバイス間で同期）
- **chrome.storage.local**: レビュー結果の一時保存（ローカルのみ）

**データ形式**:
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
  reviewSteps: {
    step: 'step1' | 'step2' | 'step3';
    enabled: boolean;
    prompt: string;
  }[];
}
```

**セキュリティ**:
- APIキーは暗号化されてブラウザ内に保存
- 外部への意図しない送信を防ぐバリデーション機能
- XSS対策のためのHTMLエスケープ処理

### ユーザーインターフェース

#### レビューボタンの配置
- **配置場所**: PRタイトル横（PRページ・差分ページ共通）
- **フォールバック機能**: GitHub DOM構造の変更に対応する複数の挿入候補

#### 進行状況表示
- **リアルタイム表示**: 各レビューステップの実行状況
- **状態表示**: 開始、処理中、完了、エラーの4つの状態
- **アニメーション**: 処理中の視覚的フィードバック

#### レビュー結果の表示
- **表示形式**: Markdown形式のテキストをそのまま表示（HTMLパースなし）
- **表示場所**：
  - **PRページ**: 右サイドバーに表示
  - **差分ページ（/files）**: 左側ファイル一覧エリアの上部に表示
- **表示内容**: Step 3の結果のみを表示（Step 1、2は内部処理でのみ使用）

### レビュー方法

#### ステップ実行の仕組み

事前に登録したpromptはsystem promptとし、各ステップでは順番に以下の内容をuser promptに設定します：

**各ステップ共通**
```
# diff
【取得したPull Requestの差分】
```

**2ステップ目以降**
```
# diff
【取得したPull Requestの差分】

# 注意すべき箇所 または # レビュー結果
【前のステップの結果】
```

#### 表示ルール

- **最後のステップの結果のみ**がページ上に表示されます
- 中間ステップの結果は内部処理でのみ使用され、次のステップへの入力として利用されます
- ステップ数が1つの場合は、そのステップの結果がそのまま表示されます

#### カスタマイズ例

**シンプル構成（2ステップ）**
1. 問題点の検出
2. 改善提案

**詳細構成（5ステップ）**
1. セキュリティチェック
2. パフォーマンス分析
3. コード品質評価
4. テスト観点でのレビュー
5. 総合的な改善提案

## インストール方法

### 開発版のインストール

1. リポジトリをクローン
```bash
git clone https://github.com/your-username/code-review-extension.git
cd code-review-extension
```

2. 依存関係をインストール
```bash
npm install
```

3. ビルド
```bash
npm run build
```

4. Chromeで拡張機能を読み込み
   - Chrome拡張機能管理ページ（`chrome://extensions/`）を開く
   - 「デベロッパーモード」を有効にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist`フォルダを選択

## 使用方法

1. Chrome拡張機能の設定画面でAIプロバイダーとAPIキーを設定
2. GitHubのPRページまたは差分ページ（/files）を開く
3. PRタイトル横の「レビュー」ボタンをクリック
4. リアルタイムで進行状況が表示され、完了後にレビュー結果が表示される

## 設定

### AIプロバイダーの設定

1. [対応するプロバイダーのAPIキーを取得](#プロバイダー別APIキー取得方法)
2. 拡張機能のアイコンをクリックし、「設定を開く」を選択
3. 使用するプロバイダーを選択
4. APIキーとモデルを設定
5. 「設定を保存」をクリック

#### プロバイダー別APIキー取得方法

- **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Claude**: [Anthropic Console](https://console.anthropic.com/)
- **Gemini**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OpenAI Compatible**: 各サービスの提供する方法に従う

**APIキー形式**: 各プロバイダーの指定する形式のみ受け付けます。不正な形式の場合はエラーメッセージが表示されます。

### レビューステップのカスタマイズ

設定画面で柔軟なステップ管理が可能です：

#### ステップ管理機能

- **ステップの追加**: 「ステップを追加」ボタンで新しいステップを作成
- **ステップの削除**: 各ステップの「×」ボタンで削除
- **順序変更**: 上下矢印ボタンでステップの実行順序を変更
- **有効/無効切り替え**: チェックボックスで個別にステップを無効化
- **ステップ名編集**: ステップ名をクリックして直接編集
- **プロンプトカスタマイズ**: 各ステップのプロンプトを個別に設定

#### 設定の復元

- **「デフォルトに戻す」**: 3ステップ構成の初期設定に復元
- **設定の保存**: 変更内容はChrome Storage APIで安全に保存
- **自動マイグレーション**: 既存の設定は新形式に自動変換

#### 使用例

**短時間レビュー用（1ステップ）**
```
ステップ1: 「重要な問題点のみを簡潔に指摘してください」
```

**詳細レビュー用（4ステップ）**
```
ステップ1: 「セキュリティ上の問題を確認」
ステップ2: 「コードの品質と可読性を評価」
ステップ3: 「パフォーマンスの観点から分析」
ステップ4: 「総合的な改善提案を作成」
```

## 開発

### 環境構築

```bash
npm install
```

### 開発モード

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

**注意**: ビルドスクリプトは `tsx` を使用して `build.mts` を実行します。`zx` ライブラリによりシェルコマンドの実行が最適化されています。

### テスト

```bash
npm test
```

### リント

```bash
npm run lint
```

## プロジェクト構造

```
code-review-extension/
├── src/
│   ├── background/         # バックグラウンドスクリプト
│   ├── content/           # コンテンツスクリプト
│   ├── popup/             # ポップアップUI
│   ├── options/           # 設定画面（APIキー・プロンプト設定）
│   ├── types/             # TypeScript型定義
│   └── utils/             # ユーティリティ関数
│       ├── api.ts         # OpenAI API通信
│       ├── github.ts      # GitHub操作
│       └── storage.ts     # Chrome Storage管理
├── assets/                # 静的アセット
│   └── icons/            # アイコンファイル
├── dist/                  # ビルド出力
├── tests/                 # テストファイル
├── manifest.json          # Chrome拡張機能マニフェスト
├── package.json           # npm設定
├── tsconfig.json          # TypeScript設定
├── vite.config.ts         # Vite設定
├── jest.config.js         # Jest設定
└── .eslintrc.js          # ESLint設定
```

## 技術スタック

- TypeScript
- Vite
- Jest
- Chrome Extension API
- zx（ビルドスクリプト）
- tsx（TypeScript実行環境）
- 複数AIプロバイダー対応
  - OpenAI API
  - Claude (Anthropic) API
  - Gemini (Google) API
  - OpenAI Compatible APIs

## 要件

- Chrome ブラウザ
- いずれかのAIプロバイダーのAPIキー
  - OpenAI APIキー
  - Claude (Anthropic) APIキー
  - Gemini (Google) APIキー
  - OpenAI Compatible APIサーバー
- Node.js 16以上（開発時のみ）

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更を行う場合は、まずissueを作成して変更内容について議論してください。

## トラブルシューティング

### よくある問題と解決方法

#### 「runtime.lastError: The message port closed before a response was received.」エラー

**原因**: レビュー処理中にタブが変更されたり、ブラウザの通信が中断された場合に発生します。

**解決方法**:
1. ページを再読み込みしてください
2. 拡張機能を一度無効化してから再度有効化してください
3. レビュー実行中は他のタブに移動しないでください

**技術的詳細**: 本拡張機能では以下の改善を実装済みです：
- タブID追跡による確実なメッセージ配信
- 5分間のタイムアウト設定
- フォールバック機能による通信の安定化

#### レビューが途中で止まる

**原因**: AIプロバイダーのAPI制限やネットワークエラーが考えられます。

**解決方法**:
1. APIキーが正しく設定されているか確認してください
2. 選択したAIプロバイダーのAPI制限を確認してください
3. しばらく時間をおいてから再度試してください

#### レビューボタンが表示されない

**原因**: GitHub のDOM構造変更や拡張機能の読み込み順序の問題です。

**解決方法**:
1. ページを再読み込みしてください
2. ブラウザのデベロッパーツールでエラーが出ていないか確認してください
3. 拡張機能が有効になっているか確認してください

## サポート

問題や質問がある場合は、[Issues](https://github.com/your-username/code-review-extension/issues)でお知らせください。
