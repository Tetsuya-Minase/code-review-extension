import { StorageService } from '../utils/storage';

/**
 * ポップアップのメインクラス
 */
class PopupController {
  private statusElement: HTMLElement | null = null;
  private statusTextElement: HTMLElement | null = null;
  private statusDotElement: HTMLElement | null = null;

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

    // APIキーを確認ボタン
    const checkApiKeyButton = document.getElementById('checkApiKey');
    checkApiKeyButton?.addEventListener('click', () => {
      this.checkApiKey();
    });
  }

  /**
   * ステータスをチェック
   */
  private async checkStatus(): Promise<void> {
    try {
      const config = await StorageService.getConfig();
      if (config.apiKey) {
        this.updateStatus('ready', '準備完了');
      } else {
        this.updateStatus('warning', 'APIキーが未設定');
      }
    } catch (error) {
      this.updateStatus('error', 'エラーが発生しました');
    }
  }

  /**
   * APIキーの確認
   */
  private async checkApiKey(): Promise<void> {
    try {
      const config = await StorageService.getConfig();
      if (config.apiKey) {
        alert('APIキーは設定されています');
      } else {
        const shouldOpenOptions = confirm('APIキーが設定されていません。設定画面を開きますか？');
        if (shouldOpenOptions) {
          chrome.runtime.openOptionsPage();
        }
      }
    } catch (error) {
      alert('エラーが発生しました');
    }
  }

  /**
   * ステータス表示を更新
   */
  private updateStatus(status: 'ready' | 'warning' | 'error', text: string): void {
    if (!this.statusElement || !this.statusTextElement || !this.statusDotElement) {
      return;
    }

    // 既存のステータスクラスを削除
    this.statusElement.classList.remove('status-ready', 'status-warning', 'status-error');
    
    // 新しいステータスクラスを追加
    this.statusElement.classList.add(`status-${status}`);
    
    // テキストを更新
    this.statusTextElement.textContent = text;
  }
}

// ポップアップコントローラーのインスタンスを作成
new PopupController();
