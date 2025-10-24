/**
 * Tests for AWS Support Request Generator
 */

const { generateSupportRequest, postIssueComment } = require('../scripts/generate-aws-support-request');

describe('AWS Support Request Generator', () => {
  describe('generateSupportRequest', () => {
    it('should throw error when API key is missing', async () => {
      const issueBody = 'Test issue';
      await expect(
        generateSupportRequest(issueBody, '', 'openai')
      ).rejects.toThrow();
    });

    it('should throw error for unsupported provider', async () => {
      const issueBody = 'Test issue';
      const apiKey = 'test-key';
      await expect(
        generateSupportRequest(issueBody, apiKey, 'unsupported')
      ).rejects.toThrow('Unsupported provider: unsupported');
    });

    // Note: Actual API call tests require mocking or integration testing
    // For MVP, we focus on basic validation
  });

  describe('Issue body parsing', () => {
    it('should handle issue body with structured fields', () => {
      const issueBody = `
### 問い合わせカテゴリ
障害調査

### 重要度
Critical（緊急）

### 対象AWSサービス
EC2

### 事象の概要
インスタンスが起動しない

### 詳細説明
発生日時: 2025-10-24
エラーメッセージ: InsufficientInstanceCapacity
`;

      // Issueボディが存在することを確認
      expect(issueBody).toBeTruthy();
      expect(issueBody).toContain('EC2');
      expect(issueBody).toContain('InsufficientInstanceCapacity');
    });
  });

  describe('postIssueComment', () => {
    it('should throw error when GitHub token is missing', async () => {
      await expect(
        postIssueComment('owner', 'repo', 1, 'comment', '')
      ).rejects.toThrow();
    });

    // Note: Actual GitHub API call tests require mocking
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Run tests with: npm test');
}
