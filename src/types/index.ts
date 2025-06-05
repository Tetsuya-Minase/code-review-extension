/**
 * レビューステップの定義
 */
export type ReviewStep = 'step1' | 'step2' | 'step3';

/**
 * レビューステップの設定
 */
export interface ReviewStepConfig {
  readonly step: ReviewStep;
  readonly prompt: string;
  readonly enabled: boolean;
}

/**
 * AIプロバイダーの種類
 */
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'openai-compatible';

/**
 * AIプロバイダー設定
 */
export interface AIProviderConfig {
  readonly provider: AIProvider;
  readonly apiKey: string;
  readonly baseUrl?: string; // OpenAI Compatible用
  readonly model?: string; // デフォルトモデル
}

/**
 * 拡張機能の設定
 */
export interface ExtensionConfig {
  readonly selectedProvider: AIProvider;
  readonly providers: {
    readonly [K in AIProvider]: {
      readonly apiKey: string;
      readonly baseUrl?: string;
      readonly model?: string;
    };
  };
  readonly reviewSteps: readonly ReviewStepConfig[];
}

/**
 * PR情報
 */
export interface PullRequestInfo {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
  readonly diffUrl: string;
}

/**
 * レビュー結果
 */
export interface ReviewResult {
  readonly step: ReviewStep;
  readonly content: string;
  readonly timestamp: number;
}

/**
 * レビューリクエスト
 */
export interface ReviewRequest {
  readonly prInfo: PullRequestInfo;
  readonly diff: string;
  readonly previousResults?: readonly ReviewResult[];
}

/**
 * OpenAI APIリクエスト
 */
export interface OpenAIRequest {
  readonly model: string;
  readonly messages: readonly {
    readonly role: 'system' | 'user' | 'assistant';
    readonly content: string;
  }[];
  readonly temperature?: number;
  readonly max_tokens?: number;
}

/**
 * OpenAI APIレスポンス
 */
export interface OpenAIResponse {
  readonly id: string;
  readonly object: string;
  readonly created: number;
  readonly model: string;
  readonly choices: readonly {
    readonly index: number;
    readonly message: {
      readonly role: string;
      readonly content: string;
    };
    readonly finish_reason: string;
  }[];
  readonly usage: {
    readonly prompt_tokens: number;
    readonly completion_tokens: number;
    readonly total_tokens: number;
  };
}
