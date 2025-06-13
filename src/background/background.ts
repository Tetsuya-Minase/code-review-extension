import { ReviewRequest, ReviewStep, ReviewResult, PullRequestInfo } from '../types';
import { StorageService } from '../utils/storage';
import { AIClientFactory } from '../utils/api';

/**
 * バックグラウンドスクリプトのメインクラス
 */
class BackgroundService {
  private currentReviewId: string | null = null;
  private currentTabId: number | null = null;

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
      // リクエスト元のタブIDを記録
      if (sender.tab?.id) {
        this.currentTabId = sender.tab.id;
      }
      
      switch (request.type) {
        case 'START_REVIEW':
          await this.startReview(request.data as ReviewRequest);
          sendResponse({ success: true });
          break;
        case 'GET_CONFIG':
          const config = await StorageService.getConfig();
          sendResponse({ success: true, data: config });
          break;
        case 'FETCH_PR_DIFF':
          const diff = await this.fetchPRDiff(request.data);
          sendResponse({ success: true, data: diff });
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
    try {
      // 設定を取得
      const config = await StorageService.getConfig();
      const currentProvider = config.providers[config.selectedProvider];
      
      if (!currentProvider.apiKey.trim()) {
        throw new Error('APIキーが設定されていません。設定画面で設定してください。');
      }

      // AIクライアントを作成
      const aiClient = AIClientFactory.createClient(
        config.selectedProvider,
        currentProvider.apiKey,
        currentProvider.model || 'gpt-4o',
        currentProvider.baseUrl
      );

      // レビューIDを生成
      this.currentReviewId = `${request.prInfo.owner}-${request.prInfo.repo}-${request.prInfo.number}`;

      // コンテンツスクリプトに開始通知
      this.notifyContentScript('REVIEW_STARTED', { reviewId: this.currentReviewId });

      // レビューステップを順次実行
      const results: ReviewResult[] = [];
      const enabledSteps = config.reviewSteps
        .filter(step => step.enabled)
        .sort((a, b) => a.order - b.order);

      for (const stepConfig of enabledSteps) {
        try {
          // ステップ開始を通知
          this.notifyContentScript('STEP_STARTED', { 
            stepId: stepConfig.id,
            stepName: stepConfig.name
          });

          // レビューステップを実行
          const result = await this.executeReviewStep(
            request,
            stepConfig.id,
            stepConfig.name,
            stepConfig.prompt,
            aiClient,
            results
          );

          results.push(result);

          // 結果を保存
          await StorageService.saveReviewResult(this.currentReviewId, result);

          // ステップ完了を通知
          this.notifyContentScript('STEP_COMPLETED', { 
            stepId: stepConfig.id,
            stepName: stepConfig.name,
            result: result.content
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '不明なエラー';
          this.notifyContentScript('STEP_ERROR', {
            stepId: stepConfig.id,
            stepName: stepConfig.name,
            error: errorMessage
          });
          
          // エラーが発生した場合も継続する（他のステップを実行）
          console.error(`Step ${stepConfig.id} failed:`, error);
        }
      }

      // 最後のステップの結果を表示
      const lastResult = results.length > 0 ? results[results.length - 1] : null;
      const finalResult = lastResult ? lastResult.content : 'レビューが完了しましたが、結果が生成されませんでした。';

      // 表示結果をストレージに保存
      try {
        await StorageService.saveDisplayedResult(this.currentReviewId, finalResult);
      } catch (error) {
        console.error('表示結果の保存に失敗しました:', error);
      }

      // 最終結果を表示
      this.notifyContentScript('REVIEW_COMPLETED', {
        reviewId: this.currentReviewId,
        result: finalResult,
        steps: results
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      this.notifyContentScript('REVIEW_ERROR', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 単一のレビューステップを実行
   */
  private async executeReviewStep(
    request: ReviewRequest,
    stepId: string,
    stepName: string,
    prompt: string,
    aiClient: any,
    previousResults: readonly ReviewResult[]
  ): Promise<ReviewResult> {
    return await aiClient.executeReview(request, stepId, stepName, prompt, previousResults);
  }

  /**
   * コンテンツスクリプトに通知を送信
   */
  private async notifyContentScript(type: string, data?: any): Promise<void> {
    // レビューを開始したタブIDが記録されている場合はそのタブに送信
    if (this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, { type, data });
        return;
      } catch (error) {
        console.log('Content script notification to recorded tab failed:', error);
        // 記録されたタブが無効な場合は、現在のタブにフォールバック
        this.currentTabId = null;
      }
    }
    
    // フォールバック: アクティブなタブに送信
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        await chrome.tabs.sendMessage(tabs[0].id, { type, data });
      }
    } catch (error) {
      console.log('Content script notification to active tab failed:', error);
      // エラーを無視（タブが閉じられている場合など）
    }
  }



  /**
   * PR差分を取得（CORSを回避するためバックグラウンドで実行）
   */
  private async fetchPRDiff(prInfo: PullRequestInfo): Promise<string> {
    const diffUrl = `https://github.com/${prInfo.owner}/${prInfo.repo}/pull/${prInfo.number}.diff`;
    
    try {
      const response = await fetch(diffUrl);
      
      if (!response.ok) {
        throw new Error(`差分の取得に失敗しました: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('差分の取得に失敗しました')) {
        throw error;
      }
      throw new Error(`差分の取得中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// バックグラウンドサービスのインスタンスを作成
new BackgroundService();
