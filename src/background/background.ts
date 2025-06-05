import { ReviewRequest, ReviewStep, ReviewResult, PullRequestInfo } from '../types';
import { StorageService } from '../utils/storage';
import { AIClientFactory } from '../utils/api';

/**
 * バックグラウンドスクリプトのメインクラス
 */
class BackgroundService {
  private currentReviewId: string | null = null;

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
    _sender: chrome.runtime.MessageSender,
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

      // 3段階のレビューを順次実行
      const results: ReviewResult[] = [];
      const enabledSteps = config.reviewSteps.filter(step => step.enabled);

      for (const stepConfig of enabledSteps) {
        try {
          // ステップ開始を通知
          this.notifyContentScript('STEP_STARTED', { 
            step: stepConfig.step,
            stepName: this.getStepName(stepConfig.step)
          });

          // レビューステップを実行
          const result = await this.executeReviewStep(
            request,
            stepConfig.step,
            stepConfig.prompt,
            aiClient,
            results
          );

          results.push(result);

          // 結果を保存
          await StorageService.saveReviewResult(this.currentReviewId, result);

          // ステップ完了を通知
          this.notifyContentScript('STEP_COMPLETED', { 
            step: stepConfig.step,
            result: result.content
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '不明なエラー';
          this.notifyContentScript('STEP_ERROR', {
            step: stepConfig.step,
            error: errorMessage
          });
          
          // エラーが発生した場合も継続する（他のステップを実行）
          console.error(`Step ${stepConfig.step} failed:`, error);
        }
      }

      // 全体の結果を構築
      const finalResult = this.buildFinalResult(results);

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
    step: ReviewStep,
    prompt: string,
    aiClient: any,
    previousResults: readonly ReviewResult[]
  ): Promise<ReviewResult> {
    return await aiClient.executeReview(request, step, prompt, previousResults);
  }

  /**
   * コンテンツスクリプトに通知を送信
   */
  private async notifyContentScript(type: string, data?: any): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        await chrome.tabs.sendMessage(tabs[0].id, { type, data });
      }
    } catch (error) {
      console.log('Content script notification failed:', error);
      // エラーを無視（タブが閉じられている場合など）
    }
  }

  /**
   * ステップ名を取得
   */
  private getStepName(step: ReviewStep): string {
    const stepNames = {
      step1: 'Step 1: 問題点の洗い出し',
      step2: 'Step 2: コードレビュー',
      step3: 'Step 3: 改善提案'
    };
    return stepNames[step] || step;
  }

  /**
   * 最終結果を構築
   */
  private buildFinalResult(results: readonly ReviewResult[]): string {
    if (results.length === 0) {
      return '## 🤖 AI コードレビュー結果\n\nレビューが完了しましたが、結果が生成されませんでした。';
    }

    let finalResult = '## 🤖 AI コードレビュー結果\n\n';
    
    results.forEach((result) => {
      const stepName = this.getStepName(result.step);
      finalResult += `### ${stepName}\n\n${result.content}\n\n`;
    });

    finalResult += `---\n*レビュー完了時刻: ${new Date().toLocaleString('ja-JP')}*`;
    
    return finalResult;
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
