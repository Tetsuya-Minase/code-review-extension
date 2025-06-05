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
      // 保存中のフィードバック表示
      this.showSavingFeedback();
      
      const apiKey = this.apiKeyInput?.value || '';
      
      // APIキーの妥当性チェック
      if (apiKey && !apiKey.startsWith('sk-')) {
        this.showStatus('APIキーの形式が正しくありません（sk-で始まる必要があります）', 'error');
        return;
      }
      
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
      
      // 成功時のフィードバック（詳細情報付き）
      const enabledSteps = reviewSteps.filter(step => step.enabled).length;
      const hasApiKey = apiKey.trim().length > 0;
      
      let successMessage = '✅ 設定を保存しました';
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
}

// オプションコントローラーのインスタンスを作成
new OptionsController();
