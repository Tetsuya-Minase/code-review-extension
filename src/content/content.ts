import { GitHubService } from '../utils/github';
import { ReviewRequest } from '../types';

/**
 * コンテンツスクリプトのメインクラス
 */
class ContentScript {
  constructor() {
    this.initialize();
  }

  /**
   * 初期化処理
   */
  private initialize(): void {
    // ページ読み込み完了後に実行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * セットアップ処理
   */
  private setup(): void {
    // PRページまたは差分ページの場合のみ処理を実行
    if (GitHubService.isPRPage() || GitHubService.isDiffPage()) {
      this.injectReviewButton();
      this.listenForMessages();
    }
  }

  /**
   * レビューボタンを挿入
   */
  private injectReviewButton(): void {
    GitHubService.insertReviewButton(() => {
      this.startReview();
    });
  }

  /**
   * レビューを開始
   */
  private async startReview(): Promise<void> {
    try {
      // PR情報を取得
      const prInfo = GitHubService.extractPRInfo();
      if (!prInfo) {
        throw new Error('PR情報を取得できませんでした');
      }

      // 差分を取得
      const diff = await GitHubService.fetchPRDiff(prInfo);

      // レビューリクエストを作成
      const reviewRequest: ReviewRequest = {
        prInfo,
        diff
      };

      // バックグラウンドスクリプトにレビュー開始を通知
      const response = await this.sendMessage('START_REVIEW', reviewRequest);
      if (!response.success) {
        throw new Error(response.error || 'レビューの開始に失敗しました');
      }
    } catch (error) {
      console.error('レビューエラー:', error);
      alert(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * メッセージリスナーを設定
   */
  private listenForMessages(): void {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }

  /**
   * メッセージハンドラー
   */
  private handleMessage(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): void {
    switch (request.type) {
      case 'DISPLAY_RESULT':
        GitHubService.displayReviewResult(request.data);
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  /**
   * バックグラウンドスクリプトにメッセージを送信
   */
  private sendMessage(type: string, data?: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, data }, resolve);
    });
  }
}

// コンテンツスクリプトのインスタンスを作成
new ContentScript();
