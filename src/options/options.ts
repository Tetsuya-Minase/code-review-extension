import { ExtensionConfig, ReviewStepConfig, AIProvider } from '../types';
import { StorageService } from '../utils/storage';

/**
 * オプション画面のメインクラス
 */
class OptionsController {
  private providerSelect: HTMLSelectElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private resetButton: HTMLButtonElement | null = null;
  private statusMessage: HTMLElement | null = null;

  // プロバイダー設定要素
  private providerConfigs: { [key in AIProvider]: HTMLElement | null } = {
    openai: null,
    claude: null,
    gemini: null,
    'openai-compatible': null
  };

  // デフォルトのプロンプト
  private readonly defaultPrompts = {
    step1: '以下のコード差分を確認し、潜在的な問題点やバグ、セキュリティ上の懸念事項を洗い出してください。特にクリティカルな問題がないかを重点的に確認してください。',
    step2: '前回の分析結果を踏まえて、以下のコード差分に対する詳細なコードレビューを行ってください。コードの品質、可読性、保守性、パフォーマンスの観点から評価してください。',
    step3: '前回のレビュー結果を踏まえて、以下のコード差分に対する具体的な改善提案を行ってください。より良いコードにするための実装例も含めて提案してください。'
  } as const;

  constructor() {
    this.initialize();
  }

  /**
   * 初期化処理
   */
  private initialize(): void {
    document.addEventListener('DOMContentLoaded', () => {
      this.setupElements();
      this.setupEventListeners();
      this.loadSettings();
    });
  }

  /**
   * DOM要素の取得
   */
  private setupElements(): void {
    this.providerSelect = document.getElementById('aiProvider') as HTMLSelectElement;
    this.saveButton = document.getElementById('saveButton') as HTMLButtonElement;
    this.resetButton = document.getElementById('resetButton') as HTMLButtonElement;
    this.statusMessage = document.getElementById('statusMessage');

    // プロバイダー設定要素を取得
    this.providerConfigs.openai = document.getElementById('openai-config');
    this.providerConfigs.claude = document.getElementById('claude-config');
    this.providerConfigs.gemini = document.getElementById('gemini-config');
    this.providerConfigs['openai-compatible'] = document.getElementById('openai-compatible-config');
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    this.saveButton?.addEventListener('click', () => {
      this.saveSettings();
    });

    this.resetButton?.addEventListener('click', () => {
      this.resetToDefaults();
    });

    // プロバイダー選択の変更イベント
    this.providerSelect?.addEventListener('change', () => {
      this.onProviderChange();
    });
  }

  /**
   * 設定を読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      const config = await StorageService.getConfig();
      
      // プロバイダー選択
      if (this.providerSelect) {
        this.providerSelect.value = config.selectedProvider;
        this.onProviderChange();
      }

      // 各プロバイダーのAPIキーとモデル設定
      Object.entries(config.providers).forEach(([provider, settings]) => {
        const providerKey = provider as AIProvider;
        
        // APIキー
        const apiKeyInput = document.getElementById(`${provider}-apiKey`) as HTMLInputElement;
        if (apiKeyInput) {
          apiKeyInput.value = settings.apiKey;
        }

        // モデル
        const modelSelect = document.getElementById(`${provider}-model`) as HTMLSelectElement;
        if (modelSelect && settings.model) {
          modelSelect.value = settings.model;
        }

        // OpenAI Compatible用のベースURL
        if (provider === 'openai-compatible') {
          const baseUrlInput = document.getElementById('compatible-baseUrl') as HTMLInputElement;
          if (baseUrlInput && settings.baseUrl) {
            baseUrlInput.value = settings.baseUrl;
          }
        }
      });

      // レビューステップ設定
      config.reviewSteps.forEach((stepConfig) => {
        const enabledCheckbox = document.getElementById(`${stepConfig.step}-enabled`) as HTMLInputElement;
        const promptTextarea = document.getElementById(`${stepConfig.step}-prompt`) as HTMLTextAreaElement;

        if (enabledCheckbox) {
          enabledCheckbox.checked = stepConfig.enabled;
        }

        if (promptTextarea) {
          promptTextarea.value = stepConfig.prompt;
        }
      });
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      // デフォルト値を設定
      this.setDefaultPrompts();
    }
  }

  /**
   * 設定を保存
   */
  private async saveSettings(): Promise<void> {
    try {
      // 保存中のフィードバック表示
      this.showSavingFeedback();
      
      const selectedProvider = this.providerSelect?.value as AIProvider;
      
      // 選択されたプロバイダーのバリデーション
      const validation = this.validateProviderConfig(selectedProvider);
      if (!validation.isValid) {
        this.showStatus(`❌ ${validation.error}`, 'error');
        this.animateSaveButton('error');
        return;
      }

      // プロバイダー設定を収集
      const providers: ExtensionConfig['providers'] = {
        openai: {
          apiKey: (document.getElementById('openai-apiKey') as HTMLInputElement)?.value || '',
          model: (document.getElementById('openai-model') as HTMLSelectElement)?.value || 'gpt-4o'
        },
        claude: {
          apiKey: (document.getElementById('claude-apiKey') as HTMLInputElement)?.value || '',
          model: (document.getElementById('claude-model') as HTMLSelectElement)?.value || 'claude-4-20250514'
        },
        gemini: {
          apiKey: (document.getElementById('gemini-apiKey') as HTMLInputElement)?.value || '',
          model: (document.getElementById('gemini-model') as HTMLSelectElement)?.value || 'gemini-2.5-flash'
        },
        'openai-compatible': {
          apiKey: (document.getElementById('compatible-apiKey') as HTMLInputElement)?.value || '',
          baseUrl: (document.getElementById('compatible-baseUrl') as HTMLInputElement)?.value || '',
          model: (document.getElementById('compatible-model') as HTMLInputElement)?.value || ''
        }
      };
      
      // レビューステップ設定を収集
      const reviewSteps: ReviewStepConfig[] = [
        {
          step: 'step1',
          enabled: (document.getElementById('step1-enabled') as HTMLInputElement)?.checked ?? true,
          prompt: (document.getElementById('step1-prompt') as HTMLTextAreaElement)?.value || this.defaultPrompts.step1
        },
        {
          step: 'step2',
          enabled: (document.getElementById('step2-enabled') as HTMLInputElement)?.checked ?? true,
          prompt: (document.getElementById('step2-prompt') as HTMLTextAreaElement)?.value || this.defaultPrompts.step2
        },
        {
          step: 'step3',
          enabled: (document.getElementById('step3-enabled') as HTMLInputElement)?.checked ?? true,
          prompt: (document.getElementById('step3-prompt') as HTMLTextAreaElement)?.value || this.defaultPrompts.step3
        }
      ];

      const config: ExtensionConfig = {
        selectedProvider,
        providers,
        reviewSteps
      };

      await StorageService.saveConfig(config);
      
      // 成功時のフィードバック（詳細情報付き）
      const enabledSteps = reviewSteps.filter(step => step.enabled).length;
      const currentProviderConfig = providers[selectedProvider];
      const hasApiKey = currentProviderConfig.apiKey.trim().length > 0;
      
      let successMessage = '✅ 設定を保存しました';
      successMessage += `\n🤖 プロバイダー: ${selectedProvider}`;
      if (hasApiKey) {
        successMessage += `\n🔑 APIキー: 設定済み`;
      } else {
        successMessage += `\n⚠️ APIキー: 未設定`;
      }
      successMessage += `\n📝 有効なレビューステップ: ${enabledSteps}/3`;
      
      this.showStatus(successMessage, 'success');
      
      // 保存ボタンに成功アニメーション
      this.animateSaveButton('success');
      
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      this.showStatus('❌ 設定の保存に失敗しました', 'error');
      this.animateSaveButton('error');
    }
  }

  /**
   * デフォルト設定に戻す
   */
  private resetToDefaults(): void {
    if (confirm('設定をデフォルトに戻しますか？')) {
      // APIキーをクリア
      if (this.apiKeyInput) {
        this.apiKeyInput.value = '';
      }

      // デフォルトプロンプトを設定
      this.setDefaultPrompts();

      // チェックボックスを全て有効に
      ['step1', 'step2', 'step3'].forEach((step) => {
        const checkbox = document.getElementById(`${step}-enabled`) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = true;
        }
      });

      this.showStatus('デフォルト設定に戻しました', 'success');
    }
  }

  /**
   * デフォルトプロンプトを設定
   */
  private setDefaultPrompts(): void {
    (document.getElementById('step1-prompt') as HTMLTextAreaElement).value = this.defaultPrompts.step1;
    (document.getElementById('step2-prompt') as HTMLTextAreaElement).value = this.defaultPrompts.step2;
    (document.getElementById('step3-prompt') as HTMLTextAreaElement).value = this.defaultPrompts.step3;
  }

  /**
   * ステータスメッセージを表示
   */
  private showStatus(message: string, type: 'success' | 'error'): void {
    if (!this.statusMessage) return;

    this.statusMessage.innerHTML = message.replace(/\n/g, '<br>');
    this.statusMessage.className = `status-message status-${type}`;
    this.statusMessage.style.display = 'block';

    // 成功時は5秒、エラー時は7秒後に非表示
    const timeout = type === 'success' ? 5000 : 7000;
    setTimeout(() => {
      if (this.statusMessage) {
        this.statusMessage.style.display = 'none';
      }
    }, timeout);
  }

  /**
   * 保存中のフィードバック表示
   */
  private showSavingFeedback(): void {
    if (!this.statusMessage || !this.saveButton) return;

    this.statusMessage.innerHTML = '💾 設定を保存中...';
    this.statusMessage.className = 'status-message status-loading';
    this.statusMessage.style.display = 'block';

    this.saveButton.disabled = true;
    this.saveButton.textContent = '保存中...';
  }

  /**
   * 保存ボタンのアニメーション
   */
  private animateSaveButton(type: 'success' | 'error'): void {
    if (!this.saveButton) return;

    const originalText = '設定を保存';
    const animationText = type === 'success' ? '✅ 保存完了!' : '❌ 保存失敗';

    this.saveButton.textContent = animationText;
    this.saveButton.className = `button button-primary ${type === 'success' ? 'save-success' : 'save-error'}`;

    setTimeout(() => {
      if (this.saveButton) {
        this.saveButton.disabled = false;
        this.saveButton.textContent = originalText;
        this.saveButton.className = 'button button-primary';
      }
    }, 2000);
  }

  /**
   * プロバイダー変更時の処理
   */
  private onProviderChange(): void {
    const selectedProvider = this.providerSelect?.value as AIProvider;
    
    // すべてのプロバイダー設定を非表示
    Object.values(this.providerConfigs).forEach(config => {
      if (config) {
        config.style.display = 'none';
      }
    });

    // 選択されたプロバイダーの設定を表示
    if (selectedProvider && this.providerConfigs[selectedProvider]) {
      this.providerConfigs[selectedProvider]!.style.display = 'block';
    }
  }

  /**
   * APIキーのバリデーション
   */
  private validateApiKey(provider: AIProvider, apiKey: string): boolean {
    if (!apiKey.trim()) return false;

    switch (provider) {
      case 'openai':
        return apiKey.startsWith('sk-');
      case 'claude':
        return apiKey.startsWith('sk-ant-');
      case 'gemini':
        return apiKey.startsWith('AIza');
      case 'openai-compatible':
        return apiKey.length > 0; // 任意の形式
      default:
        return false;
    }
  }

  /**
   * プロバイダー設定のバリデーション
   */
  private validateProviderConfig(provider: AIProvider): { isValid: boolean; error?: string } {
    const apiKeyInput = document.getElementById(`${provider}-apiKey`) as HTMLInputElement;
    const apiKey = apiKeyInput?.value || '';

    if (!this.validateApiKey(provider, apiKey)) {
      const errorMessages = {
        openai: 'OpenAI APIキーは sk- で始まる必要があります',
        claude: 'Claude APIキーは sk-ant- で始まる必要があります', 
        gemini: 'Gemini APIキーは AIza で始まる必要があります',
        'openai-compatible': 'APIキーを入力してください'
      };
      return { isValid: false, error: errorMessages[provider] };
    }

    // OpenAI Compatible用の追加バリデーション
    if (provider === 'openai-compatible') {
      const baseUrlInput = document.getElementById('compatible-baseUrl') as HTMLInputElement;
      const modelInput = document.getElementById('compatible-model') as HTMLInputElement;
      
      if (!baseUrlInput?.value?.trim()) {
        return { isValid: false, error: 'ベースURLを入力してください' };
      }
      
      if (!modelInput?.value?.trim()) {
        return { isValid: false, error: 'モデル名を入力してください' };
      }
    }

    return { isValid: true };
  }
}

// オプションコントローラーのインスタンスを作成
new OptionsController();
