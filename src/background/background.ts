import { ReviewRequest, ReviewStep } from '../types';
import { StorageService } from '../utils/storage';
import { OpenAIClient } from '../utils/api';

/**
 * バックグラウンドスクリプトのメインクラス
 */
class BackgroundService {
  private openAIClient: OpenAIClient | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * 初期化処理
   */
  private initialize(): void {
    // メッセージリスナーの設定
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // 非同期レスポンスのため
    });
  }

  /**
   * メッセージハンドラー
   */
  private async handleMessage(
    request: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (request.type) {
        case 'START_REVIEW':
          await this.startReview(request.data as ReviewRequest);
          sendResponse({ success: true });
          break;
        case 'GET_CONFIG':
          const config = await StorageService.getConfig();
          sendResponse({ success: true, data: config });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * レビュープロセスを開始
   */
  private async startReview(request: ReviewRequest): Promise<void> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * 単一のレビューステップを実行
   */
  private async executeReviewStep(
    request: ReviewRequest,
    step: ReviewStep,
    previousResults: readonly ReviewResult[]
  ): Promise<ReviewResult> {
    // TODO: 実装
    throw new Error('Not implemented');
  }
}

// バックグラウンドサービスのインスタンスを作成
new BackgroundService();
