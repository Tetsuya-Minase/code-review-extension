import { BedrockClient } from '../src/utils/api';
import { ReviewRequest, PullRequestInfo, ReviewResult } from '../src/types';

// グローバルなfetchをモック
global.fetch = jest.fn();

describe('BedrockClient', () => {
  let client: BedrockClient;
  const mockApiKey = 'test-access-key:test-secret-key';
  const mockModel = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  const mockRegion = 'us-east-1';
  const mockDomain = 'amazonaws.com';

  beforeEach(() => {
    client = new BedrockClient(mockApiKey, mockModel, mockRegion, mockDomain);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default values', () => {
      const defaultClient = new BedrockClient(mockApiKey, mockModel);
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom region and domain', () => {
      const customClient = new BedrockClient(mockApiKey, mockModel, 'us-west-2', 'amazonaws.com.cn');
      expect(customClient).toBeDefined();
    });
  });

  describe('executeReview', () => {
    const mockRequest: ReviewRequest = {
      prInfo: {
        owner: 'test-owner',
        repo: 'test-repo',
        number: 123,
        diffUrl: 'https://github.com/test-owner/test-repo/pull/123/files'
      },
      diff: 'test diff content'
    };

    it('should successfully execute review for Claude model', async () => {
      const mockResponse = {
        content: [
          { text: 'Test review result' }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.executeReview(
        mockRequest,
        'test-step',
        'Test Step',
        'Test prompt'
      );

      expect(result).toEqual({
        stepId: 'test-step',
        stepName: 'Test Step',
        content: 'Test review result',
        timestamp: expect.any(Number)
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `https://bedrock-runtime.${mockRegion}.${mockDomain}/model/${mockModel}/invoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`
          },
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 20000,
            temperature: 0.3,
            system: 'Test prompt',
            messages: [
              {
                role: 'user',
                content: '# diff\ntest diff content\n\n'
              }
            ]
          })
        }
      );
    });

    it('should successfully execute review for Titan model', async () => {
      const titanClient = new BedrockClient(mockApiKey, 'amazon.titan-text-express-v1', mockRegion, mockDomain);
      const mockResponse = {
        results: [
          { outputText: 'Test titan review result' }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await titanClient.executeReview(
        mockRequest,
        'test-step',
        'Test Step',
        'Test prompt'
      );

      expect(result).toEqual({
        stepId: 'test-step',
        stepName: 'Test Step',
        content: 'Test titan review result',
        timestamp: expect.any(Number)
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `https://bedrock-runtime.${mockRegion}.${mockDomain}/model/amazon.titan-text-express-v1/invoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`
          },
          body: JSON.stringify({
            inputText: 'Test prompt\n\n# diff\ntest diff content\n\n',
            textGenerationConfig: {
              temperature: 0.3,
              maxTokenCount: 2000
            }
          })
        }
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(client.executeReview(
        mockRequest,
        'test-step',
        'Test Step',
        'Test prompt'
      )).rejects.toThrow('Bedrock API error: 401 Unauthorized');
    });

    it('should handle empty response for Claude model', async () => {
      const mockResponse = {
        content: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(client.executeReview(
        mockRequest,
        'test-step',
        'Test Step',
        'Test prompt'
      )).rejects.toThrow('Bedrock APIから有効な応答が得られませんでした');
    });

    it('should handle empty response for Titan model', async () => {
      const titanClient = new BedrockClient(mockApiKey, 'amazon.titan-text-express-v1', mockRegion, mockDomain);
      const mockResponse = {
        results: []
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await expect(titanClient.executeReview(
        mockRequest,
        'test-step',
        'Test Step',
        'Test prompt'
      )).rejects.toThrow('Bedrock APIから有効な応答が得られませんでした');
    });

    it('should handle unsupported model', async () => {
      const unsupportedClient = new BedrockClient(mockApiKey, 'unsupported-model', mockRegion, mockDomain);

      await expect(unsupportedClient.executeReview(
        mockRequest,
        'test-step',
        'Test Step',
        'Test prompt'
      )).rejects.toThrow('Unsupported Bedrock model: unsupported-model');
    });

    it('should include previous results in prompt', async () => {
      const mockResponse = {
        content: [
          { text: 'Test review result' }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const previousResults: ReviewResult[] = [
        {
          stepId: 'previous-step',
          stepName: 'Previous Step',
          content: 'Previous result content',
          timestamp: Date.now()
        }
      ];

      await client.executeReview(
        mockRequest,
        'test-step',
        'Test Step',
        'Test prompt',
        previousResults
      );

      const expectedUserPrompt = '# diff\ntest diff content\n\n# 注意すべき箇所\nPrevious result content';
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 20000,
            temperature: 0.3,
            system: 'Test prompt',
            messages: [
              {
                role: 'user',
                content: expectedUserPrompt
              }
            ]
          })
        })
      );
    });
  });
});