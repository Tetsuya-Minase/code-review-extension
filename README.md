# Code Review AI

GitHubのコードレビューを支援するAIツール

## 概要

Code Review AIは、GitHub上のプルリクエストに対してAIを活用した自動コードレビューを提供するChrome拡張機能です。OpenAI APIを使用して、3段階の詳細なレビューを実行します。

## 主な機能

- PRページに「レビュー」ボタンを追加
- 3段階の段階的なコードレビュー
  - **Step 1**: 問題点の洗い出し、特にクリティカルな問題がないかを確認
  - **Step 2**: Step 1の結果とコード差分を元にコードレビューを実行
  - **Step 3**: Step 2の結果とコード差分を元に改善点を提案
- レビュー結果の表示
  - PRページ: 右カラムに表示
  - 差分ページ: 左カラムに表示

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

1. Chrome拡張機能の設定画面でOpenAI APIキーを設定
2. GitHubのPRページを開く
3. PRタイトル横の「レビュー」ボタンをクリック
4. AIによるレビュー結果が表示される

## 設定

### OpenAI APIキー

1. [OpenAI Platform](https://platform.openai.com/api-keys)でAPIキーを取得
2. 拡張機能のアイコンをクリックし、「設定を開く」を選択
3. APIキーを入力して保存

### レビューステップのカスタマイズ

各ステップのプロンプトは設定画面でカスタマイズ可能です。

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
│   ├── options/           # 設定画面
│   ├── types/             # TypeScript型定義
│   └── utils/             # ユーティリティ関数
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
- OpenAI API

## 要件

- Chrome ブラウザ
- OpenAI APIキー
- Node.js 16以上

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更を行う場合は、まずissueを作成して変更内容について議論してください。

## サポート

問題や質問がある場合は、[Issues](https://github.com/your-username/code-review-extension/issues)でお知らせください。
