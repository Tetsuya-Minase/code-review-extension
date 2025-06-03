import { OpenAIRequest, OpenAIResponse, ReviewRequest, ReviewResult, ReviewStep } from '../types';

/**
 * OpenAI APIクライアント
 */
export class OpenAIClient {
  /**
   * APIキーを使用してクライアントを初期化
   */
  constructor(private readonly apiKey: string) {}

  /**
   * レビューを実行
   */
  async executeReview(request: ReviewRequest, step: ReviewStep, prompt: string): Promise<ReviewResult> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * OpenAI APIにリクエストを送信
   */
  private async sendRequest(request: OpenAIRequest): Promise<OpenAIResponse> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * レビューステップ用のプロンプトを構築
   */
  private buildPrompt(request: ReviewRequest, step: ReviewStep, prompt: string): string {
    // TODO: 実装
    throw new Error('Not implemented');
  }
}
