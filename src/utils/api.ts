import { AIProvider, ReviewRequest, ReviewResult } from '../types';

/**
 * AI APIクライアントの基底クラス
 */
abstract class BaseAIClient {
  constructor(
    protected readonly apiKey: string,
    protected readonly model: string,
    protected readonly baseUrl?: string
  ) {}

  abstract executeReview(request: ReviewRequest, stepId: string, stepName: string, prompt: string, previousResults?: readonly ReviewResult[]): Promise<ReviewResult>;
}

/**
 * OpenAI APIクライアント
 */
export class OpenAIClient extends BaseAIClient {
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  async executeReview(request: ReviewRequest, stepId: string, stepName: string, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(request, stepId, previousResults);
    
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'system' as const,
          content: prompt
        },
        {
          role: 'user' as const,
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('OpenAI APIから有効な応答が得られませんでした');
    }

    return {
      stepId,
      stepName,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildUserPrompt(request: ReviewRequest, _stepId: string, previousResults: readonly ReviewResult[]): string {
    let userPrompt = '# diff\n' + request.diff + '\n\n';

    // 前のステップの結果を追加（任意のステップ数に対応）
    if (previousResults.length > 0) {
      const lastResult = previousResults[previousResults.length - 1];
      if (lastResult) {
        // ステップ数に応じてセクションタイトルを動的に決定
        const sectionTitle = previousResults.length === 1 ? '# 注意すべき箇所' : '# レビュー結果';
        userPrompt += sectionTitle + '\n' + lastResult.content;
      }
    }

    return userPrompt;
  }
}

/**
 * Claude APIクライアント
 */
export class ClaudeClient extends BaseAIClient {
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  async executeReview(request: ReviewRequest, stepId: string, stepName: string, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(request, stepId, previousResults);
    
    const requestBody = {
      model: this.model,
      max_tokens: 20000,
      temperature: 0.3,
      system: prompt,
      messages: [
        {
          role: 'user' as const,
          content: userPrompt
        }
      ]
    };
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    
    if (!content) {
      throw new Error('Claude APIから有効な応答が得られませんでした');
    }

    return {
      stepId,
      stepName,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildUserPrompt(request: ReviewRequest, _stepId: string, previousResults: readonly ReviewResult[]): string {
    let userPrompt = '# diff\n' + request.diff + '\n\n';

    // 前のステップの結果を追加（任意のステップ数に対応）
    if (previousResults.length > 0) {
      const lastResult = previousResults[previousResults.length - 1];
      if (lastResult) {
        // ステップ数に応じてセクションタイトルを動的に決定
        const sectionTitle = previousResults.length === 1 ? '# 注意すべき箇所' : '# レビュー結果';
        userPrompt += sectionTitle + '\n' + lastResult.content;
      }
    }

    return userPrompt;
  }
}

/**
 * Gemini APIクライアント
 */
export class GeminiClient extends BaseAIClient {
  private get apiUrl() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
  }

  async executeReview(request: ReviewRequest, stepId: string, stepName: string, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(request, stepId, previousResults);
    const fullPrompt = prompt + '\n\n' + userPrompt;
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: fullPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000
      }
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('Gemini APIから有効な応答が得られませんでした');
    }

    return {
      stepId,
      stepName,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildUserPrompt(request: ReviewRequest, _stepId: string, previousResults: readonly ReviewResult[]): string {
    let userPrompt = '# diff\n' + request.diff + '\n\n';

    // 前のステップの結果を追加（任意のステップ数に対応）
    if (previousResults.length > 0) {
      const lastResult = previousResults[previousResults.length - 1];
      if (lastResult) {
        // ステップ数に応じてセクションタイトルを動的に決定
        const sectionTitle = previousResults.length === 1 ? '# 注意すべき箇所' : '# レビュー結果';
        userPrompt += sectionTitle + '\n' + lastResult.content;
      }
    }

    return userPrompt;
  }
}

/**
 * OpenAI Compatible APIクライアント
 */
export class OpenAICompatibleClient extends BaseAIClient {
  private get apiUrl() {
    return `${this.baseUrl}/chat/completions`;
  }

  async executeReview(request: ReviewRequest, stepId: string, stepName: string, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const userPrompt = this.buildUserPrompt(request, stepId, previousResults);
    
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'system' as const,
          content: prompt
        },
        {
          role: 'user' as const,
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('APIから有効な応答が得られませんでした');
    }

    return {
      stepId,
      stepName,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildUserPrompt(request: ReviewRequest, _stepId: string, previousResults: readonly ReviewResult[]): string {
    let userPrompt = '# diff\n' + request.diff + '\n\n';

    // 前のステップの結果を追加（任意のステップ数に対応）
    if (previousResults.length > 0) {
      const lastResult = previousResults[previousResults.length - 1];
      if (lastResult) {
        // ステップ数に応じてセクションタイトルを動的に決定
        const sectionTitle = previousResults.length === 1 ? '# 注意すべき箇所' : '# レビュー結果';
        userPrompt += sectionTitle + '\n' + lastResult.content;
      }
    }

    return userPrompt;
  }
}

/**
 * AIクライアントファクトリー
 */
export class AIClientFactory {
  static createClient(provider: AIProvider, apiKey: string, model: string, baseUrl?: string): BaseAIClient {
    switch (provider) {
      case 'openai':
        return new OpenAIClient(apiKey, model);
      case 'claude':
        return new ClaudeClient(apiKey, model);
      case 'gemini':
        return new GeminiClient(apiKey, model);
      case 'openai-compatible':
        if (!baseUrl) {
          throw new Error('OpenAI Compatible requires baseUrl');
        }
        return new OpenAICompatibleClient(apiKey, model, baseUrl);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}
