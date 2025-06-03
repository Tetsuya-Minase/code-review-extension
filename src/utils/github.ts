import { PullRequestInfo } from '../types';

/**
 * GitHub関連のユーティリティクラス
 */
export class GitHubService {
  /**
   * 現在のページからPR情報を取得
   */
  static extractPRInfo(): PullRequestInfo | null {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * PR差分を取得
   */
  static async fetchPRDiff(prInfo: PullRequestInfo): Promise<string> {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * レビューボタンを挿入
   */
  static insertReviewButton(onClick: () => void): void {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * レビュー結果を表示
   */
  static displayReviewResult(content: string): void {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * 現在のページがPRページかどうかを判定
   */
  static isPRPage(): boolean {
    // TODO: 実装
    throw new Error('Not implemented');
  }

  /**
   * 現在のページが差分ページかどうかを判定
   */
  static isDiffPage(): boolean {
    // TODO: 実装
    throw new Error('Not implemented');
  }
}
