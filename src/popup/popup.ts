import { StorageService } from '../utils/storage';
import { AIProvider } from '../types';

/**
 * ポップアップのメインクラス
 */
class PopupController {
  private statusElement: HTMLElement | null = null;
  private statusTextElement: HTMLElement | null = null;
  private statusDotElement: HTMLElement | null = null;
  private providerInfoElement: HTMLElement | null = null;
  private providerNameElement: HTMLElement | null = null;

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
      this.checkStatus();
    });
  }

  /**
   * DOM要素の取得
   */
  private setupElements(): void {
    this.statusElement = document.getElementById('status');
    this.statusTextElement = document.querySelector('.status-text');
    this.statusDotElement = document.querySelector('.status-dot');
    this.providerInfoElement = document.getElementById('provider-info');
    this.providerNameElement = document.getElementById('provider-name');
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // 設定を開くボタン
    const openOptionsButton = document.getElementById('openOptions');
    openOptionsButton?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // 設定を確認ボタン
    const checkConfigButton = document.getElementById('checkConfig');
    checkConfigButton?.addEventListener('click', () => {
      this.checkConfiguration();
    });
  }

  /**
   * ステータスをチェック
   */
  private async checkStatus(): Promise<void> {
    try {
      const config = await StorageService.getConfig();
      const currentProvider = config.providers[config.selectedProvider];
      
      if (currentProvider.apiKey.trim()) {
        this.updateStatus('ready', '準備完了', config.selectedProvider);
      } else {
        this.updateStatus('warning', 'APIキーが未設定', config.selectedProvider);
      }
    } catch (error) {
      this.updateStatus('error', 'エラーが発生しました');
    }
  }

  /**
   * 設定の確認
   */
  private async checkConfiguration(): Promise<void> {
    try {
      const config = await StorageService.getConfig();
      const currentProvider = config.providers[config.selectedProvider];
      const enabledSteps = config.reviewSteps.filter(step => step.enabled).length;
      
      let message = `プロバイダー: ${this.getProviderDisplayName(config.selectedProvider)}\n`;
      
      if (currentProvider.apiKey.trim()) {
        message += 'APIキー: ✅ 設定済み\n';
      } else {
        message += 'APIキー: ❌ 未設定\n';
      }
      
      if (currentProvider.model) {
        message += `モデル: ${currentProvider.model}\n`;
      }
      
      if (config.selectedProvider === 'openai-compatible' && currentProvider.baseUrl) {
        message += `ベースURL: ${currentProvider.baseUrl}\n`;
      }
      
      message += `有効なレビューステップ: ${enabledSteps}/3`;
      
      if (!currentProvider.apiKey.trim()) {
        const shouldOpenOptions = confirm(`${message}\n\nAPIキーが設定されていません。設定画面を開きますか？`);
        if (shouldOpenOptions) {
          chrome.runtime.openOptionsPage();
        }
      } else {
        alert(message);
      }
    } catch (error) {
      alert('エラーが発生しました');
    }
  }

  /**
   * ステータス表示を更新
   */
  private updateStatus(status: 'ready' | 'warning' | 'error', text: string, provider?: AIProvider): void {
    if (!this.statusElement || !this.statusTextElement || !this.statusDotElement) {
      return;
    }

    // 既存のステータスクラスを削除
    this.statusElement.classList.remove('status-ready', 'status-warning', 'status-error');
    
    // 新しいステータスクラスを追加
    this.statusElement.classList.add(`status-${status}`);
    
    // テキストを更新
    this.statusTextElement.textContent = text;
    
    // プロバイダー情報を更新
    if (provider && this.providerInfoElement && this.providerNameElement) {
      this.providerNameElement.textContent = this.getProviderDisplayName(provider);
      this.providerInfoElement.style.display = 'block';
    } else if (this.providerInfoElement) {
      this.providerInfoElement.style.display = 'none';
    }
  }

  /**
   * プロバイダーの表示名を取得
   */
  private getProviderDisplayName(provider: AIProvider): string {
    const displayNames = {
      openai: 'OpenAI',
      claude: 'Claude',
      gemini: 'Gemini',
      'openai-compatible': 'OpenAI Compatible'
    };
    return displayNames[provider] || provider;
  }
}

// ポップアップコントローラーのインスタンスを作成
new PopupController();
