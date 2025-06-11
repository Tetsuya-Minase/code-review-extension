import { ExtensionConfig, ReviewResult, ReviewStepConfig, AIProvider } from '../types';

/**
 * Chrome Storage APIのラッパークラス
 */
export class StorageService {
  private static readonly CONFIG_KEY = 'extension_config';
  private static readonly REVIEW_RESULTS_PREFIX = 'review_results_';
  private static readonly DISPLAYED_RESULTS_PREFIX = 'displayed_results_';

  /**
   * デフォルト設定
   */
  private static readonly DEFAULT_CONFIG: ExtensionConfig = {
    selectedProvider: 'openai',
    providers: {
      openai: {
        apiKey: '',
        model: 'gpt-4o'
      },
      claude: {
        apiKey: '',
        model: 'claude-sonnet-4-20250514'
      },
      gemini: {
        apiKey: '',
        model: 'gemini-2.5-flash'
      },
      'openai-compatible': {
        apiKey: '',
        baseUrl: '',
        model: ''
      }
    },
    reviewSteps: [
      {
        id: 'step1',
        name: 'Step 1: 問題点の洗い出し',
        enabled: true,
        order: 1,
        prompt: '以下のコード差分を確認し、潜在的な問題点やバグ、セキュリティ上の懸念事項を洗い出してください。特にクリティカルな問題がないかを重点的に確認してください。'
      },
      {
        id: 'step2',
        name: 'Step 2: コードレビュー',
        enabled: true,
        order: 2,
        prompt: '前回の分析結果を踏まえて、以下のコード差分に対する詳細なコードレビューを行ってください。コードの品質、可読性、保守性、パフォーマンスの観点から評価してください。'
      },
      {
        id: 'step3',
        name: 'Step 3: 改善提案',
        enabled: true,
        order: 3,
        prompt: '前回のレビュー結果を踏まえて、以下のコード差分に対する具体的な改善提案を行ってください。より良いコードにするための実装例も含めて提案してください。'
      }
    ] as readonly ReviewStepConfig[]
  };

  /**
   * 拡張機能の設定を取得
   */
  static async getConfig(): Promise<ExtensionConfig> {
    try {
      const result = await chrome.storage.sync.get(this.CONFIG_KEY);
      
      if (!result[this.CONFIG_KEY]) {
        return this.DEFAULT_CONFIG;
      }

      const config = result[this.CONFIG_KEY] as ExtensionConfig;
      
      // 設定の妥当性チェック
      if (!config.reviewSteps || config.reviewSteps.length === 0) {
        return this.DEFAULT_CONFIG;
      }

      // 旧形式から新形式へのマイグレーション
      const migratedSteps = config.reviewSteps.map((step, index) => {
        if ('step' in step && !('id' in step)) {
          // 旧形式の場合、新形式に変換
          const oldStep = step as any;
          return {
            id: oldStep.step,
            name: `Step ${index + 1}`,
            enabled: oldStep.enabled,
            order: index + 1,
            prompt: oldStep.prompt
          };
        }
        return step;
      }) as ReviewStepConfig[];

      // マイグレーションが発生した場合のみ保存
      const hasOldFormat = config.reviewSteps.some(step => 'step' in step && !('id' in step));
      if (hasOldFormat) {
        // マイグレーションした設定を保存
        const migratedConfig = { ...config, reviewSteps: migratedSteps };
        await this.saveConfig(migratedConfig);
        return migratedConfig;
      }

      // 新しい設定形式への移行チェック
      if (!config.selectedProvider || !config.providers) {
        // 古い形式の場合、マイグレーション
        const migratedConfig: ExtensionConfig = {
          selectedProvider: 'openai',
          providers: {
            openai: {
              apiKey: ('apiKey' in config && config.apiKey) ? config.apiKey as string : '',
              model: 'gpt-4o'
            },
            claude: {
              apiKey: '',
              model: 'claude-sonnet-4-20250514'
            },
            gemini: {
              apiKey: '',
              model: 'gemini-2.5-flash'
            },
            'openai-compatible': {
              apiKey: '',
              baseUrl: '',
              model: ''
            }
          },
          reviewSteps: config.reviewSteps
        };
        
        return migratedConfig;
      }

      return config;
    } catch (error) {
      console.error('設定の取得に失敗しました:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  /**
   * 拡張機能の設定を保存
   */
  static async saveConfig(config: ExtensionConfig): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.CONFIG_KEY]: config
      });
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      throw new Error('設定の保存に失敗しました');
    }
  }

  /**
   * レビュー結果を取得
   */
  static async getReviewResults(prId: string): Promise<readonly ReviewResult[]> {
    try {
      const key = this.REVIEW_RESULTS_PREFIX + prId;
      const result = await chrome.storage.local.get(key);
      
      return result[key] || [];
    } catch (error) {
      console.error('レビュー結果の取得に失敗しました:', error);
      return [];
    }
  }

  /**
   * レビュー結果を保存
   */
  static async saveReviewResult(prId: string, result: ReviewResult): Promise<void> {
    try {
      const key = this.REVIEW_RESULTS_PREFIX + prId;
      const existing = await this.getReviewResults(prId);
      
      // 同じステップの結果があれば置き換え、なければ追加
      const updated = [...existing.filter(r => r.stepId !== result.stepId), result];
      
      await chrome.storage.local.set({
        [key]: updated
      });
    } catch (error) {
      console.error('レビュー結果の保存に失敗しました:', error);
      throw new Error('レビュー結果の保存に失敗しました');
    }
  }

  /**
   * レビュー結果をクリア
   */
  static async clearReviewResults(prId: string): Promise<void> {
    try {
      const key = this.REVIEW_RESULTS_PREFIX + prId;
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('レビュー結果のクリアに失敗しました:', error);
      throw new Error('レビュー結果のクリアに失敗しました');
    }
  }

  /**
   * APIキーの存在確認
   */
  static async hasApiKey(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const currentProvider = config.providers[config.selectedProvider];
      return currentProvider.apiKey.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * 現在選択されているプロバイダーの設定を取得
   */
  static async getCurrentProviderConfig() {
    const config = await this.getConfig();
    return {
      provider: config.selectedProvider,
      ...config.providers[config.selectedProvider]
    };
  }

  /**
   * 表示済みレビュー結果を保存
   */
  static async saveDisplayedResult(prId: string, result: string): Promise<void> {
    try {
      const key = this.DISPLAYED_RESULTS_PREFIX + prId;
      await chrome.storage.local.set({
        [key]: {
          content: result,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('表示済みレビュー結果の保存に失敗しました:', error);
      throw new Error('表示済みレビュー結果の保存に失敗しました');
    }
  }

  /**
   * 表示済みレビュー結果を取得
   */
  static async getDisplayedResult(prId: string): Promise<{ content: string; timestamp: number } | null> {
    try {
      const key = this.DISPLAYED_RESULTS_PREFIX + prId;
      const result = await chrome.storage.local.get(key);
      
      return result[key] || null;
    } catch (error) {
      console.error('表示済みレビュー結果の取得に失敗しました:', error);
      return null;
    }
  }

  /**
   * 表示済みレビュー結果をクリア
   */
  static async clearDisplayedResult(prId: string): Promise<void> {
    try {
      const key = this.DISPLAYED_RESULTS_PREFIX + prId;
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('表示済みレビュー結果のクリアに失敗しました:', error);
      throw new Error('表示済みレビュー結果のクリアに失敗しました');
    }
  }
}
