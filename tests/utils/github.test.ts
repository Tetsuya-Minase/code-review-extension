import { GitHubService } from '../../src/utils/github';
import { PullRequestInfo } from '../../src/types';

describe('GitHubService', () => {
  // DOM環境のモック設定
  beforeEach(() => {
    // URLをリセット
    delete (window as any).location;
    (window as any).location = { href: '', pathname: '' };
    
    // DOMをクリア
    document.body.innerHTML = '';
    
    // chrome APIの完全なモック
    (window as any).chrome = {
      runtime: {
        sendMessage: jest.fn(),
        lastError: null
      },
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined)
        },
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined)
        }
      }
    };
  });

  describe('isPRPage', () => {
    it('PRページのURLパターンを正しく判定する', () => {
      window.location.href = 'https://github.com/owner/repo/pull/123';
      window.location.pathname = '/owner/repo/pull/123';
      
      expect(GitHubService.isPRPage()).toBe(true);
    });

    it('PR以外のページでfalseを返す', () => {
      window.location.href = 'https://github.com/owner/repo';
      window.location.pathname = '/owner/repo';
      
      expect(GitHubService.isPRPage()).toBe(false);
    });

    it('差分ページでもtrueを返す', () => {
      window.location.href = 'https://github.com/owner/repo/pull/123/files';
      window.location.pathname = '/owner/repo/pull/123/files';
      
      expect(GitHubService.isPRPage()).toBe(true);
    });

    it('コミットページでfalseを返す', () => {
      window.location.href = 'https://github.com/owner/repo/pull/123/commits';
      window.location.pathname = '/owner/repo/pull/123/commits';
      
      expect(GitHubService.isPRPage()).toBe(true);
    });
  });

  describe('isDiffPage', () => {
    it('差分ページのURLパターンを正しく判定する', () => {
      window.location.href = 'https://github.com/owner/repo/pull/123/files';
      window.location.pathname = '/owner/repo/pull/123/files';
      
      expect(GitHubService.isDiffPage()).toBe(true);
    });

    it('差分ページ以外でfalseを返す', () => {
      window.location.href = 'https://github.com/owner/repo/pull/123';
      window.location.pathname = '/owner/repo/pull/123';
      
      expect(GitHubService.isDiffPage()).toBe(false);
    });
  });

  describe('extractPRInfo', () => {
    it('PRページからPR情報を正しく抽出する', () => {
      window.location.href = 'https://github.com/owner/repo/pull/123';
      window.location.pathname = '/owner/repo/pull/123';
      
      const prInfo = GitHubService.extractPRInfo();
      
      expect(prInfo).toEqual({
        owner: 'owner',
        repo: 'repo',
        number: 123,
        diffUrl: 'https://github.com/owner/repo/pull/123/files'
      });
    });

    it('特殊文字を含むリポジトリ名を正しく処理する', () => {
      window.location.href = 'https://github.com/my-org/my-repo.js/pull/456';
      window.location.pathname = '/my-org/my-repo.js/pull/456';
      
      const prInfo = GitHubService.extractPRInfo();
      
      expect(prInfo).toEqual({
        owner: 'my-org',
        repo: 'my-repo.js',
        number: 456,
        diffUrl: 'https://github.com/my-org/my-repo.js/pull/456/files'
      });
    });

    it('PR以外のページでnullを返す', () => {
      window.location.href = 'https://github.com/owner/repo';
      window.location.pathname = '/owner/repo';
      
      const prInfo = GitHubService.extractPRInfo();
      
      expect(prInfo).toBeNull();
    });

    it('不正なPR番号の場合nullを返す', () => {
      window.location.href = 'https://github.com/owner/repo/pull/abc';
      window.location.pathname = '/owner/repo/pull/abc';
      
      const prInfo = GitHubService.extractPRInfo();
      
      expect(prInfo).toBeNull();
    });
  });

  describe('fetchPRDiff', () => {
    const mockPRInfo: PullRequestInfo = {
      owner: 'owner',
      repo: 'repo',
      number: 123,
      diffUrl: 'https://github.com/owner/repo/pull/123/files'
    };

    it('バックグラウンドスクリプト経由で差分を取得する', async () => {
      const mockDiffContent = `diff --git a/src/file1.ts b/src/file1.ts
index 1234567..abcdefg 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,3 +1,3 @@
 function test() {
-  console.log('old');
+  console.log('new');
 }`;

      // sendMessageのモック設定
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_message, callback) => {
        callback({ success: true, data: mockDiffContent });
      });

      const diff = await GitHubService.fetchPRDiff(mockPRInfo);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'FETCH_PR_DIFF', data: mockPRInfo },
        expect.any(Function)
      );
      expect(diff).toBe(mockDiffContent);
    });

    it('バックグラウンドスクリプトがエラーを返した場合はエラーをスローする', async () => {
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_message, callback) => {
        callback({ success: false, error: '差分の取得に失敗しました: 404 Not Found' });
      });

      await expect(GitHubService.fetchPRDiff(mockPRInfo)).rejects.toThrow(
        '差分の取得に失敗しました: 404 Not Found'
      );
    });

    it('Chrome runtime errorの場合は適切なエラーをスローする', async () => {
      (chrome.runtime as any).lastError = { message: 'Extension context invalidated' };
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_message, callback) => {
        callback(null);
      });

      await expect(GitHubService.fetchPRDiff(mockPRInfo)).rejects.toThrow(
        'Chrome runtime error: Extension context invalidated'
      );
      
      // lastErrorをリセット
      (chrome.runtime as any).lastError = null;
    });
  });

  describe('insertReviewButton', () => {
    it('PRページにレビューボタンを挿入する', () => {
      // PRページのヘッダー構造をモック
      document.body.innerHTML = `
        <div class="gh-header-actions">
          <button class="btn">既存のボタン</button>
        </div>
      `;

      const onClick = jest.fn();
      GitHubService.insertReviewButton(onClick);

      const button = document.querySelector('button.code-review-ai-button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('レビュー');
      
      // クリックイベントのテスト
      button.click();
      expect(onClick).toHaveBeenCalled();
    });

    it('差分ページにレビューボタンを挿入する', () => {
      window.location.pathname = '/owner/repo/pull/123/files';
      
      // 差分ページでも同じPRヘッダー構造をモック
      document.body.innerHTML = `
        <div class="gh-header-actions">
          <button class="btn">既存のボタン</button>
        </div>
      `;

      const onClick = jest.fn();
      GitHubService.insertReviewButton(onClick);

      const button = document.querySelector('button.code-review-ai-button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('レビュー');

      // クリックイベントをテスト
      button.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('既にボタンが存在する場合は重複挿入しない', () => {
      document.body.innerHTML = `
        <div class="gh-header-actions">
          <button class="code-review-ai-button">レビュー</button>
        </div>
      `;

      const onClick = jest.fn();
      GitHubService.insertReviewButton(onClick);

      const buttons = document.querySelectorAll('button.code-review-ai-button');
      expect(buttons.length).toBe(1);
    });

    it('gh-header-metaがある場合はボタンを挿入する', () => {
      document.body.innerHTML = `
        <div class="gh-header-meta">
          <div class="existing-content">既存のコンテンツ</div>
        </div>
      `;

      const onClick = jest.fn();
      GitHubService.insertReviewButton(onClick);

      const button = document.querySelector('button.code-review-ai-button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('レビュー');
    });

    it('挿入場所が見つからない場合はフローティングボタンを作成する', () => {
      document.body.innerHTML = '<div>Empty page</div>';

      const onClick = jest.fn();
      GitHubService.insertReviewButton(onClick);

      // フローティングボタンがbodyに追加されることを確認
      const button = document.querySelector('button.code-review-ai-button') as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent).toContain('レビュー');
      expect(button.style.position).toBe('fixed');
    });
  });

  describe('displayReviewResult', () => {
    it('PRページの右カラムにレビュー結果を表示する', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="Layout-sidebar">
          <div class="existing-content">既存のコンテンツ</div>
        </div>
      `;

      const content = '## レビュー結果\n\nテストレビュー内容';
      await GitHubService.displayReviewResult(content, false);

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement).toBeTruthy();
      expect(resultElement?.innerHTML).toContain('<pre class="review-content-raw">## レビュー結果\n\nテストレビュー内容</pre>');
    });

    it('差分ページの左カラムにレビュー結果を表示する', async () => {
      window.location.pathname = '/owner/repo/pull/123/files';
      document.body.innerHTML = `
        <div id="files">
          <div class="existing-file-list">既存のファイル一覧</div>
        </div>
      `;

      const content = '## レビュー結果\n\nテストレビュー内容';
      await GitHubService.displayReviewResult(content, false);

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement).toBeTruthy();
      
      // ファイル一覧の最初の子要素として挿入されることを確認
      const filesContainer = document.querySelector('#files');
      expect(filesContainer?.firstChild).toBe(resultElement);
    });

    it('XSS攻撃を防ぐ', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="Layout-sidebar"></div>
      `;

      const maliciousContent = '<script>alert("XSS")</script>';
      await GitHubService.displayReviewResult(maliciousContent, false);

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement?.innerHTML).not.toContain('<script>');
      expect(resultElement?.innerHTML).toContain('&lt;script&gt;');
    });

    it('表示場所が見つからない場合はエラーをスローする', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = '<div>Empty page</div>';

      await expect(GitHubService.displayReviewResult('content', false)).rejects.toThrow(
        'レビュー結果の表示場所が見つかりませんでした'
      );
    });
  });

  describe('restoreReviewResult', () => {
    it('保存されたレビュー結果を復元する', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="Layout-sidebar">
          <div class="existing-content">既存のコンテンツ</div>
        </div>
      `;

      // StorageService.getDisplayedResultをモック
      const mockDisplayedResult = {
        content: '## 保存されたレビュー結果\n\n復元テスト内容',
        timestamp: Date.now()
      };
      
      jest.spyOn(require('../../src/utils/storage').StorageService, 'getDisplayedResult')
        .mockResolvedValue(mockDisplayedResult);

      await GitHubService.restoreReviewResult();

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement).toBeTruthy();
      expect(resultElement?.innerHTML).toContain('<pre class="review-content-raw">## 保存されたレビュー結果\n\n復元テスト内容</pre>');
    });

    it('保存されたレビュー結果がない場合は何もしない', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="Layout-sidebar">
          <div class="existing-content">既存のコンテンツ</div>
        </div>
      `;

      // StorageService.getDisplayedResultをnullを返すようにモック
      jest.spyOn(require('../../src/utils/storage').StorageService, 'getDisplayedResult')
        .mockResolvedValue(null);

      await GitHubService.restoreReviewResult();

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement).toBeNull();
    });

    it('既にレビュー結果が表示されている場合は復元しない', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="Layout-sidebar">
          <div class="code-review-ai-result">既存の結果</div>
        </div>
      `;

      const mockDisplayedResult = {
        content: '## 保存されたレビュー結果\n\n復元テスト内容',
        timestamp: Date.now()
      };
      
      const getDisplayedResultSpy = jest.spyOn(require('../../src/utils/storage').StorageService, 'getDisplayedResult')
        .mockResolvedValue(mockDisplayedResult);

      await GitHubService.restoreReviewResult();

      // getDisplayedResultが呼ばれたことを確認
      expect(getDisplayedResultSpy).toHaveBeenCalled();
      
      // 既存の結果のみが存在することを確認
      const resultElements = document.querySelectorAll('.code-review-ai-result');
      expect(resultElements.length).toBe(1);
      expect(resultElements[0].textContent).toBe('既存の結果');
    });
  });
});
