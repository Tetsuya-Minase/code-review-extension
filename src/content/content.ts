import { GitHubService } from '../utils/github';
import { ReviewRequest } from '../types';

/**
 * コンテンツスクリプトのメインクラス
 */
class ContentScript {
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';

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

    // SPA遷移を監視
    this.setupNavigationObserver();
  }

  /**
   * セットアップ処理
   */
  private async setup(): Promise<void> {
    // 現在のURLを記録
    this.currentUrl = window.location.href;

    // PRページまたは差分ページの場合のみ処理を実行
    if (GitHubService.isPRPage() || GitHubService.isDiffPage()) {
      this.injectReviewButton();
      this.listenForMessages();
      
      // 保存されたレビュー結果を復元
      await this.restoreReviewResults();
    }
  }

  /**
   * SPA遷移を監視するMutationObserverをセットアップ
   */
  private setupNavigationObserver(): void {
    // URLの変更を監視（GitHubのSPA遷移検出）
    this.observer = new MutationObserver(() => {
      if (window.location.href !== this.currentUrl) {
        this.currentUrl = window.location.href;
        this.handleNavigation();
      }
    });

    // body要素の変更を監視
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // popstateイベントも監視（ブラウザの戻る/進むボタン）
    window.addEventListener('popstate', () => {
      setTimeout(() => this.handleNavigation(), 100);
    });
  }

  /**
   * ナビゲーション（ページ遷移）時の処理
   */
  private async handleNavigation(): Promise<void> {
    try {
      // 少し待ってからDOM要素が安定するのを待つ
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // PRページまたは差分ページの場合のみ処理を実行
      if (GitHubService.isPRPage() || GitHubService.isDiffPage()) {
        // レビューボタンを再注入（存在しない場合のみ）
        this.injectReviewButton();
        
        // 保存されたレビュー結果を復元
        await this.restoreReviewResults();
      }
    } catch (error) {
      console.error('ナビゲーション処理でエラーが発生しました:', error);
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
    _sender: chrome.runtime.MessageSender,
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
        GitHubService.showReviewProgress(`${request.data.step}が完了しました`, 'completed');
        sendResponse({ success: true });
        break;
      case 'STEP_ERROR':
        GitHubService.showReviewProgress(`${request.data.step}でエラーが発生: ${request.data.error}`, 'error');
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
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, data }, resolve);
    });
  }
}

// コンテンツスクリプトのインスタンスを作成
new ContentScript();
