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
  private async setup(): Promise<void> {
    // PRページまたは差分ページの場合のみ処理を実行
    if (GitHubService.isPRPage() || GitHubService.isDiffPage()) {
      this.injectReviewButton();
      this.setupDOMObserver();
      this.listenForMessages();
      
      // 保存されたレビュー結果を復元
      await this.restoreReviewResults();
    }
  }

  /**
   * 保存されたレビュー結果を復元
   */
  private async restoreReviewResults(): Promise<void> {
    try {
      // DOM要素が準備されるまで少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      await GitHubService.restoreReviewResult();
    } catch (error) {
      console.error('レビュー結果の復元に失敗しました:', error);
    }
  }

  /**
   * レビューボタンを挿入
   */
  private injectReviewButton(): void {
    try {
      GitHubService.insertReviewButton(() => {
        this.startReview();
      });
    } catch (error) {
      console.warn('レビューボタンの挿入に失敗:', error);
      // 1秒後に再試行
      setTimeout(() => this.injectReviewButton(), 1000);
    }
  }

  /**
   * DOM監視を設定してボタンの再挿入を行う
   */
  private setupDOMObserver(): void {
    const observer = new MutationObserver((mutations) => {
      // レビューボタンが存在しない場合は再挿入を試行
      const existingButton = document.querySelector('.code-review-ai-button');
      if (!existingButton && (GitHubService.isPRPage() || GitHubService.isDiffPage())) {
        this.injectReviewButton();
      }
    });

    // ページ全体を監視対象にして、子要素の追加・削除を監視
    observer.observe(document.body, {
      childList: true,
      subtree: true
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
      case 'REVIEW_STARTED':
        GitHubService.showReviewProgress('レビューを開始しています...', 'started');
        sendResponse({ success: true });
        break;
      case 'STEP_STARTED':
        GitHubService.showReviewProgress(`${request.data.stepName}を実行中...`, 'processing');
        sendResponse({ success: true });
        break;
      case 'STEP_COMPLETED':
        GitHubService.showReviewProgress(`${request.data.stepName}が完了しました`, 'completed');
        sendResponse({ success: true });
        break;
      case 'STEP_ERROR':
        GitHubService.showReviewProgress(`${request.data.stepName}でエラーが発生: ${request.data.error}`, 'error');
        sendResponse({ success: true });
        break;
      case 'REVIEW_COMPLETED':
        GitHubService.displayReviewResult(request.data.result);
        GitHubService.hideReviewProgress();
        sendResponse({ success: true });
        break;
      case 'REVIEW_ERROR':
        GitHubService.showReviewProgress(`エラー: ${request.data.error}`, 'error');
        setTimeout(() => GitHubService.hideReviewProgress(), 5000);
        sendResponse({ success: true });
        break;
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
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, data }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!response) {
          reject(new Error('バックグラウンドスクリプトからの応答がありません'));
          return;
        }
        
        resolve(response);
      });
    });
  }
}

// コンテンツスクリプトのインスタンスを作成
new ContentScript();
