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
   * PR差分を取得
   * @param prInfo PR情報
   * @returns unified diff形式の差分文字列
   * @throws 差分要素が見つからない場合
   */
  static async fetchPRDiff(prInfo: PullRequestInfo): Promise<string> {
    // 差分ページでない場合は遷移
    if (!this.isDiffPage()) {
      await this.navigateToDiffPage(prInfo.diffUrl);
    }
    
    // 差分要素を取得
    const fileElements = document.querySelectorAll('.js-file');
    if (fileElements.length === 0) {
      throw new Error('差分要素が見つかりませんでした');
    }
    
    const diffs = Array.from(fileElements).map(fileElement => 
      this.extractFileDiff(fileElement)
    );
    
    return diffs.join('\n\n');
  }
  
  /**
   * 差分ページへ遷移
   * @param diffUrl 差分ページのURL
   */
  private static async navigateToDiffPage(diffUrl: string): Promise<void> {
    window.location.assign(diffUrl);
    // ページ遷移後の処理は実際の拡張機能では別途処理が必要
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  /**
   * ファイル要素から差分を抽出
   * @param fileElement ファイル要素
   * @returns 差分文字列
   */
  private static extractFileDiff(fileElement: Element): string {
    const fileHeader = fileElement.querySelector('.file-header');
    const filePath = fileHeader?.getAttribute('data-path') ?? 'unknown';
    
    const diffLines: string[] = [
      `--- a/${filePath}`,
      `+++ b/${filePath}`
    ];
    
    // 差分コードを取得
    const codeLines = fileElement.querySelectorAll('.blob-code');
    codeLines.forEach(line => {
      const text = line.textContent ?? '';
      const diffLine = this.formatDiffLine(line, text);
      diffLines.push(diffLine);
    });
    
    return diffLines.join('\n');
  }
  
  /**
   * 差分行をフォーマット
   * @param line DOM要素
   * @param text テキスト内容
   * @returns フォーマットされた差分行
   */
  private static formatDiffLine(line: Element, text: string): string {
    if (line.classList.contains('blob-code-deletion')) {
      return `-${text.substring(1)}`;
    } else if (line.classList.contains('blob-code-addition')) {
      return `+${text.substring(1)}`;
    } else {
      return ` ${text}`;
    }
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
    
    // Markdownをパース（簡易実装）
    const htmlContent = this.parseMarkdown(content);
    resultContainer.innerHTML = htmlContent;
    
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
    const html = escaped
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
    
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
}
