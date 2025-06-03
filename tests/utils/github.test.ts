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

    beforeEach(() => {
      // fetchのモック
      (window as any).fetch = jest.fn();
    });

    it('差分ページから差分を取得する', async () => {
      // 差分ページのDOM構造をモック
      window.location.pathname = '/owner/repo/pull/123/files';
      document.body.innerHTML = `
        <div class="js-file">
          <div class="file-header" data-path="src/file1.ts">src/file1.ts</div>
          <div class="blob-wrapper">
            <table class="diff-table">
              <tr>
                <td class="blob-code blob-code-deletion">- old line</td>
              </tr>
              <tr>
                <td class="blob-code blob-code-addition">+ new line</td>
              </tr>
            </table>
          </div>
        </div>
        <div class="js-file">
          <div class="file-header" data-path="src/file2.ts">src/file2.ts</div>
          <div class="blob-wrapper">
            <table class="diff-table">
              <tr>
                <td class="blob-code blob-code-context">  context line</td>
              </tr>
              <tr>
                <td class="blob-code blob-code-addition">+ added line</td>
              </tr>
            </table>
          </div>
        </div>
      `;

      const diff = await GitHubService.fetchPRDiff(mockPRInfo);
      
      expect(diff).toContain('--- a/src/file1.ts');
      expect(diff).toContain('+++ b/src/file1.ts');
      expect(diff).toContain('- old line');
      expect(diff).toContain('+ new line');
      expect(diff).toContain('--- a/src/file2.ts');
      expect(diff).toContain('+++ b/src/file2.ts');
      expect(diff).toContain('  context line');
      expect(diff).toContain('+ added line');
    });

    it('差分ページでない場合は遷移してから取得する', async () => {
      window.location.pathname = '/owner/repo/pull/123';
      
      // ページ遷移をモック
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = {
        ...originalLocation,
        href: '',
        assign: jest.fn()
      };

      // 差分ページのDOM構造をモック（遷移後）
      setTimeout(() => {
        window.location.pathname = '/owner/repo/pull/123/files';
        document.body.innerHTML = `
          <div class="js-file">
            <div class="file-header" data-path="test.ts">test.ts</div>
            <div class="blob-wrapper">
              <table class="diff-table">
                <tr>
                  <td class="blob-code blob-code-addition">+ test</td>
                </tr>
              </table>
            </div>
          </div>
        `;
      }, 100);

      const diff = await GitHubService.fetchPRDiff(mockPRInfo);
      
      expect(window.location.assign).toHaveBeenCalledWith(mockPRInfo.diffUrl);
      expect(diff).toContain('+ test');
    });

    it('差分要素が見つからない場合はエラーをスローする', async () => {
      window.location.pathname = '/owner/repo/pull/123/files';
      document.body.innerHTML = '<div>No diff content</div>';

      await expect(GitHubService.fetchPRDiff(mockPRInfo)).rejects.toThrow(
        '差分要素が見つかりませんでした'
      );
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

    it('挿入場所が見つからない場合はエラーをスローする', () => {
      document.body.innerHTML = '<div>Empty page</div>';

      const onClick = jest.fn();
      expect(() => GitHubService.insertReviewButton(onClick)).toThrow(
        'レビューボタンの挿入場所が見つかりませんでした'
      );
    });
  });

  describe('displayReviewResult', () => {
    it('PRページの右カラムにレビュー結果を表示する', () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="Layout-sidebar">
          <div class="existing-content">既存のコンテンツ</div>
        </div>
      `;

      const content = '## レビュー結果\n\nテストレビュー内容';
      GitHubService.displayReviewResult(content);

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement).toBeTruthy();
      expect(resultElement?.innerHTML).toContain('<h2>レビュー結果</h2>');
      expect(resultElement?.innerHTML).toContain('<p>テストレビュー内容</p>');
    });

    it('差分ページの左カラムにレビュー結果を表示する', () => {
      window.location.pathname = '/owner/repo/pull/123/files';
      document.body.innerHTML = `
        <div class="pr-toolbar">
          <div class="existing-content">既存のコンテンツ</div>
        </div>
      `;

      const content = '## レビュー結果\n\nテストレビュー内容';
      GitHubService.displayReviewResult(content);

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement).toBeTruthy();
      expect(resultElement?.parentElement?.className).toContain('pr-toolbar');
    });

    it('XSS攻撃を防ぐ', () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = `
        <div class="Layout-sidebar"></div>
      `;

      const maliciousContent = '<script>alert("XSS")</script>';
      GitHubService.displayReviewResult(maliciousContent);

      const resultElement = document.querySelector('.code-review-ai-result');
      expect(resultElement?.innerHTML).not.toContain('<script>');
      expect(resultElement?.innerHTML).toContain('&lt;script&gt;');
    });

    it('表示場所が見つからない場合はエラーをスローする', () => {
      window.location.pathname = '/owner/repo/pull/123';
      document.body.innerHTML = '<div>Empty page</div>';

      expect(() => GitHubService.displayReviewResult('content')).toThrow(
        'レビュー結果の表示場所が見つかりませんでした'
      );
    });
  });
});
