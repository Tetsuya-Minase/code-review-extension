import { ExtensionConfig, ReviewStepConfig, AIProvider } from '../types';
import { StorageService } from '../utils/storage';

/**
 * オプション画面のメインクラス
 */
class OptionsController {
  private providerSelect: HTMLSelectElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private resetButton: HTMLButtonElement | null = null;
  private addStepButton: HTMLButtonElement | null = null;
  private statusMessage: HTMLElement | null = null;
  private stepsContainer: HTMLElement | null = null;

  // プロバイダー設定要素
  private providerConfigs: { [key in AIProvider]: HTMLElement | null } = {
    openai: null,
    claude: null,
    gemini: null,
    'openai-compatible': null,
    bedrock: null
  };

  // ステップカウンター
  private stepCounter = 0;

  // デフォルトのステップ
  private readonly defaultSteps: ReviewStepConfig[] = [
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
  ];

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
    this.addStepButton = document.getElementById('addStepButton') as HTMLButtonElement;
    this.statusMessage = document.getElementById('statusMessage');
    this.stepsContainer = document.getElementById('stepsContainer');

    // プロバイダー設定要素を取得
    this.providerConfigs.openai = document.getElementById('openai-config');
    this.providerConfigs.claude = document.getElementById('claude-config');
    this.providerConfigs.gemini = document.getElementById('gemini-config');
    this.providerConfigs['openai-compatible'] = document.getElementById('openai-compatible-config');
    this.providerConfigs.bedrock = document.getElementById('bedrock-config');

    // ステップコンテナの初期化確認
    if (!this.stepsContainer) {
      console.error('Steps container not found');
    }
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

    this.addStepButton?.addEventListener('click', () => {
      this.addNewStep();
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
        
        // APIキー
        const apiKeyInput = document.getElementById(`${provider}-apiKey`) as HTMLInputElement;
        if (apiKeyInput) {
          apiKeyInput.value = settings.apiKey;
        }

        // モデル
        const modelElement = document.getElementById(`${provider}-model`) as HTMLSelectElement | HTMLInputElement;
        if (modelElement && settings.model) {
          modelElement.value = settings.model;
        }

        // OpenAI Compatible用のベースURL
        if (provider === 'openai-compatible') {
          const baseUrlInput = document.getElementById('compatible-baseUrl') as HTMLInputElement;
          if (baseUrlInput && settings.baseUrl) {
            baseUrlInput.value = settings.baseUrl;
          }
        }

        // Bedrock用のリージョンとドメイン
        if (provider === 'bedrock') {
          const regionInput = document.getElementById('bedrock-region') as HTMLInputElement;
          const domainInput = document.getElementById('bedrock-domain') as HTMLInputElement;
          if (regionInput && settings.region) {
            regionInput.value = settings.region;
          }
          if (domainInput && settings.baseUrl) {
            domainInput.value = settings.baseUrl;
          }
        }
      });

      // レビューステップ設定
      // ステップコンテナが存在することを確認してからレンダリング
      if (this.stepsContainer) {
        this.renderSteps(config.reviewSteps);
      } else {
        console.error('Steps container not found during loadSettings');
        // 少し待ってから再試行
        setTimeout(() => {
          if (this.stepsContainer) {
            this.renderSteps(config.reviewSteps);
          } else {
            this.renderSteps(this.defaultSteps);
          }
        }, 100);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      // デフォルトステップを設定
      if (this.stepsContainer) {
        this.renderSteps(this.defaultSteps);
      }
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
        },
        bedrock: {
          apiKey: (document.getElementById('bedrock-apiKey') as HTMLInputElement)?.value || '',
          model: (document.getElementById('bedrock-model') as HTMLInputElement)?.value || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
          region: (document.getElementById('bedrock-region') as HTMLInputElement)?.value || 'us-east-1',
          baseUrl: (document.getElementById('bedrock-domain') as HTMLInputElement)?.value || 'amazonaws.com'
        }
      };
      
      // レビューステップ設定を収集
      const reviewSteps = this.collectStepsFromDOM();

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
      successMessage += `\n📝 有効なレビューステップ: ${enabledSteps}/${reviewSteps.length}`;
      
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
      // 全プロバイダーのAPIキーをクリア
      const apiKeyIds = ['openai-apiKey', 'claude-apiKey', 'gemini-apiKey', 'compatible-apiKey', 'bedrock-apiKey'];
      apiKeyIds.forEach(id => {
        const input = document.getElementById(id) as HTMLInputElement;
        if (input) {
          input.value = '';
        }
      });

      // OpenAI Compatible特有のフィールドもクリア
      const baseUrlInput = document.getElementById('compatible-baseUrl') as HTMLInputElement;
      const modelInput = document.getElementById('compatible-model') as HTMLInputElement;
      if (baseUrlInput) baseUrlInput.value = '';
      if (modelInput) modelInput.value = '';

      // Bedrock特有のフィールドもクリア
      const regionInput = document.getElementById('bedrock-region') as HTMLInputElement;
      const domainInput = document.getElementById('bedrock-domain') as HTMLInputElement;
      if (regionInput) regionInput.value = 'us-east-1';
      if (domainInput) domainInput.value = 'amazonaws.com';

      // デフォルトステップを設定
      this.renderSteps(this.defaultSteps);

      this.showStatus('デフォルト設定に戻しました', 'success');
    }
  }

  /**
   * ステップをレンダリング
   */
  private renderSteps(steps: readonly ReviewStepConfig[]): void {
    if (!this.stepsContainer) return;

    this.stepsContainer.innerHTML = '';
    this.stepCounter = 0;

    steps.forEach((step, index) => {
      this.createStepElement(step, index);
    });
  }

  /**
   * ステップ要素を作成
   */
  private createStepElement(step: ReviewStepConfig, index: number): void {
    if (!this.stepsContainer) return;

    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-config';
    stepDiv.dataset.stepId = step.id;

    stepDiv.innerHTML = `
      <div class="step-header">
        <h3>
          <input type="checkbox" id="${step.id}-enabled" ${step.enabled ? 'checked' : ''} />
          <input type="text" id="${step.id}-name" class="step-name-input" value="${step.name}" />
        </h3>
        <div class="step-controls">
          <button type="button" class="button button-small move-up" title="上に移動">↑</button>
          <button type="button" class="button button-small move-down" title="下に移動">↓</button>
          <button type="button" class="button button-small button-danger remove-step" title="削除">×</button>
        </div>
      </div>
      <div class="form-group">
        <label for="${step.id}-prompt">プロンプト</label>
        <textarea 
          id="${step.id}-prompt" 
          class="form-textarea" 
          rows="4"
          placeholder="このステップで使用するプロンプトを入力してください"
        >${step.prompt}</textarea>
      </div>
    `;

    // イベントリスナーを設定
    const moveUpBtn = stepDiv.querySelector('.move-up') as HTMLButtonElement;
    const moveDownBtn = stepDiv.querySelector('.move-down') as HTMLButtonElement;
    const removeBtn = stepDiv.querySelector('.remove-step') as HTMLButtonElement;

    moveUpBtn?.addEventListener('click', () => this.moveStep(index, -1));
    moveDownBtn?.addEventListener('click', () => this.moveStep(index, 1));
    removeBtn?.addEventListener('click', () => this.removeStep(step.id));

    this.stepsContainer.appendChild(stepDiv);
    this.stepCounter++;
  }

  /**
   * 新しいステップを追加
   */
  private addNewStep(): void {
    const newStepNumber = this.stepCounter + 1;
    const newStep: ReviewStepConfig = {
      id: `step${Date.now()}`,
      name: `Step ${newStepNumber}: 新しいステップ`,
      enabled: true,
      order: newStepNumber,
      prompt: 'プロンプトを入力してください'
    };

    this.createStepElement(newStep, this.stepCounter);
  }

  /**
   * ステップを移動
   */
  private moveStep(index: number, direction: number): void {
    const originalSteps = this.collectStepsFromDOM();
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= originalSteps.length) return;

    // 新しい配列を作成して要素を入れ替え
    const steps = [...originalSteps];
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    
    // orderを更新した新しいステップ配列を作成
    const updatedSteps = steps.map((step, i) => ({
      ...step,
      order: i + 1
    }));

    this.renderSteps(updatedSteps);
  }

  /**
   * ステップを削除
   */
  private removeStep(stepId: string): void {
    if (confirm('このステップを削除しますか？')) {
      const originalSteps = this.collectStepsFromDOM().filter(step => step.id !== stepId);
      
      // orderを再計算した新しいステップ配列を作成
      const updatedSteps = originalSteps.map((step, i) => ({
        ...step,
        order: i + 1
      }));

      this.renderSteps(updatedSteps);
    }
  }

  /**
   * DOMからステップ情報を収集
   */
  private collectStepsFromDOM(): ReviewStepConfig[] {
    if (!this.stepsContainer) {
      console.warn('Steps container not found, returning default steps');
      return this.defaultSteps;
    }

    const stepElements = this.stepsContainer.querySelectorAll('.step-config');
    const steps: ReviewStepConfig[] = [];

    if (stepElements.length === 0) {
      console.warn('No step elements found, returning default steps');
      return this.defaultSteps;
    }

    stepElements.forEach((element, index) => {
      const stepId = element.getAttribute('data-step-id');
      if (!stepId) return;

      const enabledInput = element.querySelector(`#${stepId}-enabled`) as HTMLInputElement;
      const nameInput = element.querySelector(`#${stepId}-name`) as HTMLInputElement;
      const promptTextarea = element.querySelector(`#${stepId}-prompt`) as HTMLTextAreaElement;

      if (nameInput && promptTextarea) {
        steps.push({
          id: stepId,
          name: nameInput.value || `Step ${index + 1}`,
          enabled: enabledInput?.checked ?? true,
          order: index + 1,
          prompt: promptTextarea.value || ''
        });
      }
    });

    if (steps.length === 0) {
      console.warn('No valid steps collected from DOM, returning default steps');
      return this.defaultSteps;
    }

    return steps;
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
      case 'bedrock':
        return apiKey.length > 0; // AWS認証情報は形式が多様
      default:
        return false;
    }
  }

  /**
   * プロバイダー設定のバリデーション
   */
  private validateProviderConfig(provider: AIProvider): { isValid: boolean; error?: string } {
    // OpenAI Compatible用の特別なID処理
    const apiKeyId = provider === 'openai-compatible' ? 'compatible-apiKey' : `${provider}-apiKey`;
    const apiKeyInput = document.getElementById(apiKeyId) as HTMLInputElement;
    const apiKey = apiKeyInput?.value || '';

    if (!this.validateApiKey(provider, apiKey)) {
      const errorMessages = {
        openai: 'OpenAI APIキーは sk- で始まる必要があります',
        claude: 'Claude APIキーは sk-ant- で始まる必要があります', 
        gemini: 'Gemini APIキーは AIza で始まる必要があります',
        'openai-compatible': 'APIキーを入力してください',
        bedrock: 'AWS認証情報を入力してください'
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
