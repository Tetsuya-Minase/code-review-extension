import { AIProvider, ReviewRequest, ReviewResult, ReviewStep } from '../types';

/**
 * AI APIクライアントの基底クラス
 */
abstract class BaseAIClient {
  constructor(
    protected readonly apiKey: string,
    protected readonly model: string,
    protected readonly baseUrl?: string
  ) {}

  abstract executeReview(request: ReviewRequest, step: ReviewStep, prompt: string, previousResults?: readonly ReviewResult[]): Promise<ReviewResult>;
}

/**
 * OpenAI APIクライアント
 */
export class OpenAIClient extends BaseAIClient {
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  async executeReview(request: ReviewRequest, step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const fullPrompt = this.buildPrompt(request, step, prompt, previousResults);
    
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'system' as const,
          content: 'あなたは経験豊富なソフトウェアエンジニアです。コードレビューを行い、建設的なフィードバックを日本語で提供してください。'
        },
        {
          role: 'user' as const,
          content: fullPrompt
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
      step,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildPrompt(request: ReviewRequest, _step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[]): string {
    let fullPrompt = `${prompt}\n\n`;

    // 前のステップの結果を含める
    if (previousResults.length > 0) {
      fullPrompt += '前のステップの結果:\n';
      previousResults.forEach(result => {
        fullPrompt += `\n## ${result.step.toUpperCase()}の結果:\n${result.content}\n`;
      });
      fullPrompt += '\n上記を踏まえて、以下のコード差分をレビューしてください:\n\n';
    }

    fullPrompt += '## コード差分:\n```diff\n' + request.diff + '\n```';
    return fullPrompt;
  }
}

/**
 * Claude APIクライアント
 */
export class ClaudeClient extends BaseAIClient {
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';

  async executeReview(request: ReviewRequest, step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const fullPrompt = this.buildPrompt(request, step, prompt, previousResults);
    
    const requestBody = {
      model: this.model,
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user' as const,
          content: fullPrompt
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
      step,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildPrompt(request: ReviewRequest, _step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[]): string {
    let fullPrompt = 'あなたは経験豊富なソフトウェアエンジニアです。コードレビューを行い、建設的なフィードバックを日本語で提供してください。\n\n';
    fullPrompt += `${prompt}\n\n`;

    if (previousResults.length > 0) {
      fullPrompt += '前のステップの結果:\n';
      previousResults.forEach(result => {
        fullPrompt += `\n## ${result.step.toUpperCase()}の結果:\n${result.content}\n`;
      });
      fullPrompt += '\n上記を踏まえて、以下のコード差分をレビューしてください:\n\n';
    }

    fullPrompt += '## コード差分:\n```diff\n' + request.diff + '\n```';
    return fullPrompt;
  }
}

/**
 * Gemini APIクライアント
 */
export class GeminiClient extends BaseAIClient {
  private get apiUrl() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
  }

  async executeReview(request: ReviewRequest, step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const fullPrompt = this.buildPrompt(request, step, prompt, previousResults);
    
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
      step,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildPrompt(request: ReviewRequest, _step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[]): string {
    let fullPrompt = 'あなたは経験豊富なソフトウェアエンジニアです。コードレビューを行い、建設的なフィードバックを日本語で提供してください。\n\n';
    fullPrompt += `${prompt}\n\n`;

    if (previousResults.length > 0) {
      fullPrompt += '前のステップの結果:\n';
      previousResults.forEach(result => {
        fullPrompt += `\n## ${result.step.toUpperCase()}の結果:\n${result.content}\n`;
      });
      fullPrompt += '\n上記を踏まえて、以下のコード差分をレビューしてください:\n\n';
    }

    fullPrompt += '## コード差分:\n```diff\n' + request.diff + '\n```';
    return fullPrompt;
  }
}

/**
 * OpenAI Compatible APIクライアント
 */
export class OpenAICompatibleClient extends BaseAIClient {
  private get apiUrl() {
    return `${this.baseUrl}/chat/completions`;
  }

  async executeReview(request: ReviewRequest, step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[] = []): Promise<ReviewResult> {
    const fullPrompt = this.buildPrompt(request, step, prompt, previousResults);
    
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'system' as const,
          content: 'あなたは経験豊富なソフトウェアエンジニアです。コードレビューを行い、建設的なフィードバックを日本語で提供してください。'
        },
        {
          role: 'user' as const,
          content: fullPrompt
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
      step,
      content: content.trim(),
      timestamp: Date.now()
    };
  }

  private buildPrompt(request: ReviewRequest, _step: ReviewStep, prompt: string, previousResults: readonly ReviewResult[]): string {
    let fullPrompt = `${prompt}\n\n`;

    if (previousResults.length > 0) {
      fullPrompt += '前のステップの結果:\n';
      previousResults.forEach(result => {
        fullPrompt += `\n## ${result.step.toUpperCase()}の結果:\n${result.content}\n`;
      });
      fullPrompt += '\n上記を踏まえて、以下のコード差分をレビューしてください:\n\n';
    }

    fullPrompt += '## コード差分:\n```diff\n' + request.diff + '\n```';
    return fullPrompt;
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
