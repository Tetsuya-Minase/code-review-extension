import { ExtensionConfig, ReviewStepConfig } from '../types';
import { StorageService } from '../utils/storage';

/**
 * オプション画面のメインクラス
 */
class OptionsController {
  private apiKeyInput: HTMLInputElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private resetButton: HTMLButtonElement | null = null;
  private statusMessage: HTMLElement | null = null;

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
    this.apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    this.saveButton = document.getElementById('saveButton') as HTMLButtonElement;
    this.resetButton = document.getElementById('resetButton') as HTMLButtonElement;
    this.statusMessage = document.getElementById('statusMessage');
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
  }

  /**
   * 設定を読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      const config = await StorageService.getConfig();
      
      // APIキー
      if (this.apiKeyInput && config.apiKey) {
        this.apiKeyInput.value = config.apiKey;
      }

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
      const apiKey = this.apiKeyInput?.value || '';
      
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
        apiKey,
        reviewSteps
      };

      await StorageService.saveConfig(config);
      this.showStatus('設定を保存しました', 'success');
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      this.showStatus('設定の保存に失敗しました', 'error');
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

    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message status-${type}`;
    this.statusMessage.style.display = 'block';

    // 3秒後に非表示
    setTimeout(() => {
      if (this.statusMessage) {
        this.statusMessage.style.display = 'none';
      }
    }, 3000);
  }
}

// オプションコントローラーのインスタンスを作成
new OptionsController();
