import { PullRequestInfo } from '../types';

/**
 * GitHub関連のユーティリティクラス
 */
export class GitHubService {
  // 定数定義
  private static readonly PR_URL_PATTERN = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
  private static readonly DIFF_URL_PATTERN = /^\/[^/]+\/[^/]+\/pull\/\d+\/files/;
  private static readonly REVIEW_BUTTON_CLASS = 'code-review-ai-button';
  private static readonly REVIEW_RESULT_CLASS = 'code-review-ai-result';
  private static readonly PROGRESS_CONTAINER_CLASS = 'code-review-ai-progress';
  
  /**
   * 現在のページからPR情報を取得
   * @returns PR情報またはnull（PRページでない場合）
   */
  static extractPRInfo(): PullRequestInfo | null {
    const pathname = window.location.pathname;
    const match = pathname.match(this.PR_URL_PATTERN);
    
    if (!match) {
      return null;
    }
    
    const [, owner, repo, numberStr] = match;
    const number = parseInt(numberStr, 10);
    
    if (isNaN(number)) {
      return null;
    }
    
    return {
      owner,
      repo,
      number,
      diffUrl: `https://github.com/${owner}/${repo}/pull/${number}/files`
    };
  }

  /**
   * PR差分を取得（バックグラウンドスクリプト経由でCORSを回避）
   * @param prInfo PR情報
   * @returns unified diff形式の差分文字列
   * @throws 差分の取得に失敗した場合
   */
  static async fetchPRDiff(prInfo: PullRequestInfo): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'FETCH_PR_DIFF', data: prInfo },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`));
            return;
          }
          
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || '差分の取得に失敗しました'));
          }
        }
      );
    });
  }

  /**
   * レビューボタンを挿入
   * @param onClick クリック時のコールバック関数
   * @throws 挿入場所が見つからない場合
   */
  static insertReviewButton(onClick: () => void): void {
    // 既存のボタンをチェック
    if (document.querySelector(`.${this.REVIEW_BUTTON_CLASS}`)) {
      return;
    }
    
    // 挿入場所を探す
    const actionsContainer = document.querySelector('.gh-header-actions');
    if (!actionsContainer) {
      throw new Error('レビューボタンの挿入場所が見つかりませんでした');
    }
    
    // ボタンを作成して挿入
    const button = this.createReviewButton(onClick);
    actionsContainer.insertBefore(button, actionsContainer.firstChild);
  }
  
  /**
   * レビューボタンを作成
   * @param onClick クリック時のコールバック関数
   * @returns ボタン要素
   */
  private static createReviewButton(onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `btn btn-sm ${this.REVIEW_BUTTON_CLASS}`;
    button.textContent = '🤖 レビュー';
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * レビュー結果を表示
   * @param content Markdown形式のレビュー内容
   * @throws 表示場所が見つからない場合
   */
  static displayReviewResult(content: string): void {
    // 既存の結果を削除
    this.removeExistingResult();
    
    // 結果コンテナを作成
    const resultContainer = this.createResultContainer(content);
    
    // 表示場所を決定して追加
    const targetContainer = this.findTargetContainer();
    if (!targetContainer) {
      throw new Error('レビュー結果の表示場所が見つかりませんでした');
    }
    
    targetContainer.appendChild(resultContainer);
  }
  
  /**
   * 既存の結果を削除
   */
  private static removeExistingResult(): void {
    const existingResult = document.querySelector(`.${this.REVIEW_RESULT_CLASS}`);
    if (existingResult) {
      existingResult.remove();
    }
  }
  
  /**
   * 結果コンテナを作成
   * @param content Markdown形式のコンテンツ
   * @returns 結果コンテナ要素
   */
  private static createResultContainer(content: string): HTMLDivElement {
    const resultContainer = document.createElement('div');
    resultContainer.className = `${this.REVIEW_RESULT_CLASS} Box mt-3`;
    
    // Markdownを生テキストとして表示
    const escapedContent = this.escapeHtml(content);
    
    resultContainer.innerHTML = `
      <div class="Box-header">
        <h3 class="Box-title d-flex flex-items-center">
          <span class="mr-2">🤖</span>
          AI コードレビュー結果
          <button class="btn-octicon ml-auto" onclick="this.closest('.${this.REVIEW_RESULT_CLASS}').remove()">
            <svg class="octicon octicon-x" viewBox="0 0 16 16" width="16" height="16">
              <path fill-rule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path>
            </svg>
          </button>
        </h3>
      </div>
      <div class="Box-body">
        <pre class="review-content-raw">${escapedContent}</pre>
      </div>
    `;
    
    return resultContainer;
  }
  
  /**
   * 表示対象のコンテナを探す
   * @returns コンテナ要素またはnull
   */
  private static findTargetContainer(): Element | null {
    if (this.isDiffPage()) {
      return document.querySelector('.pr-toolbar');
    } else {
      return document.querySelector('.Layout-sidebar');
    }
  }

  /**
   * 現在のページがPRページかどうかを判定
   * @returns PRページの場合true
   */
  static isPRPage(): boolean {
    const pathname = window.location.pathname;
    return this.PR_URL_PATTERN.test(pathname);
  }

  /**
   * 現在のページが差分ページかどうかを判定
   * @returns 差分ページの場合true
   */
  static isDiffPage(): boolean {
    const pathname = window.location.pathname;
    return this.DIFF_URL_PATTERN.test(pathname);
  }
  
  /**
   * 簡易的なMarkdownパーサー
   * @param markdown Markdown形式のテキスト
   * @returns HTML形式のテキスト
   */
  private static parseMarkdown(markdown: string): string {
    // XSS対策のためHTMLエスケープ
    const escaped = this.escapeHtml(markdown);
    
    // 簡易的なMarkdown変換
    let html = escaped
      // ヘッダー
      .replace(/^## (.+)$/gm, '<h2 class="h3 mb-3 mt-4">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="h4 mb-3 mt-3">$1</h3>')
      // コードブロック
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-light p-3 rounded-2 mt-2 mb-2"><code>$2</code></pre>')
      // インラインコード
      .replace(/`([^`]+)`/g, '<code class="bg-gray-light px-1 rounded-1">$1</code>')
      // リスト
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul class="ml-3 mb-3">$1</ul>')
      // 段落
      .split('\n\n')
      .map(paragraph => {
        paragraph = paragraph.trim();
        if (!paragraph) return '';
        if (paragraph.startsWith('<h2>') || paragraph.startsWith('<h3>') || 
            paragraph.startsWith('<pre>') || paragraph.startsWith('<ul>')) {
          return paragraph;
        }
        return `<p class="mb-3">${paragraph}</p>`;
      })
      .join('\n');
    
    return html;
  }
  
  /**
   * HTMLエスケープ
   * @param text エスケープ対象のテキスト
   * @returns エスケープされたテキスト
   */
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

  /**
   * レビュー進行状況を表示
   */
  static showReviewProgress(message: string, status: 'started' | 'processing' | 'completed' | 'error'): void {
    // 既存の進行状況を削除
    this.hideReviewProgress();

    // 進行状況コンテナを作成
    const progressContainer = this.createProgressContainer(message, status);

    // 表示場所を決定して追加
    const targetContainer = this.findTargetContainer();
    if (targetContainer) {
      targetContainer.insertBefore(progressContainer, targetContainer.firstChild);
    }
  }

  /**
   * レビュー進行状況を非表示
   */
  static hideReviewProgress(): void {
    const existingProgress = document.querySelector(`.${this.PROGRESS_CONTAINER_CLASS}`);
    if (existingProgress) {
      existingProgress.remove();
    }
  }

  /**
   * 進行状況コンテナを作成
   */
  private static createProgressContainer(message: string, status: string): HTMLDivElement {
    const container = document.createElement('div');
    container.className = `${this.PROGRESS_CONTAINER_CLASS} Box Box--condensed mb-3`;
    
    const statusIcon = this.getStatusIcon(status);
    const statusClass = `progress-${status}`;
    
    container.innerHTML = `
      <div class="Box-header ${statusClass}">
        <h3 class="Box-title d-flex flex-items-center">
          <span class="status-icon mr-2">${statusIcon}</span>
          🤖 AI コードレビュー
        </h3>
      </div>
      <div class="Box-body">
        <p class="mb-0">${this.escapeHtml(message)}</p>
        ${status === 'processing' ? '<div class="progress-bar mt-2"></div>' : ''}
      </div>
    `;

    return container;
  }

  /**
   * ステータスアイコンを取得
   */
  private static getStatusIcon(status: string): string {
    const icons = {
      started: '🚀',
      processing: '⏳',
      completed: '✅',
      error: '❌'
    };
    return icons[status as keyof typeof icons] || '🤖';
  }
}
