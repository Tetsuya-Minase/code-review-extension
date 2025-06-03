import { ExtensionConfig, ReviewResult } from '../types';

/**
 * Chrome Storage APIのラッパークラス
 */
export class StorageService {
  /**
   * 拡張機能の設定を取得
   */
  static async getConfig(): Promise<ExtensionConfig> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * 拡張機能の設定を保存
   */
  static async saveConfig(config: ExtensionConfig): Promise<void> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * レビュー結果を取得
   */
  static async getReviewResults(prId: string): Promise<readonly ReviewResult[]> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * レビュー結果を保存
   */
  static async saveReviewResult(prId: string, result: ReviewResult): Promise<void> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * レビュー結果をクリア
   */
  static async clearReviewResults(prId: string): Promise<void> {
    // TODO: 実装
    throw new Error('Not implemented');
  }
}
