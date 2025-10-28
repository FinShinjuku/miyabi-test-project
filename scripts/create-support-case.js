#!/usr/bin/env node

/**
 * AWS Support Case Creation Script
 *
 * GitHub IssueからAWSサポートケースを自動起票
 */

const { AWSSupportClient } = require('./aws-support-client');
const https = require('https');

/**
 * GitHub Issueから

AWSサポートケースを作成
 * @param {string} issueBody - Issue本文
 * @param {number} issueNumber - Issue番号
 * @param {Object} options - オプション
 */
async function createSupportCaseFromIssue(issueBody, issueNumber, options = {}) {
  const {
    githubToken,
    repository,
    awsProfile = 'default',
    mockMode = false
  } = options;

  try {
    console.log(`📝 Processing Issue #${issueNumber}`);
    console.log(`🔧 Mock Mode: ${mockMode ? 'ON' : 'OFF'}`);

    // Issue本文を解析
    const caseData = parseIssueBody(issueBody);
    console.log(`📊 Parsed case data: ${caseData.subject}`);

    // AWS Support Client初期化
    const client = new AWSSupportClient({
      profile: awsProfile,
      mockMode
    });

    // サポートケースを作成
    console.log('🚀 Creating AWS Support case...');
    const result = await client.createCase(caseData);

    console.log(`✅ Case created: ${result.displayId || result.caseId}`);

    // GitHub IssueにケースIDを保存（コメント）
    if (githubToken && repository) {
      await postCaseIdToIssue(
        repository,
        issueNumber,
        result.caseId,
        result.displayId,
        githubToken
      );
    }

    return result;

  } catch (error) {
    console.error('❌ Error creating support case:', error.message);

    // GitHub Issueにエラー通知
    if (options.githubToken && options.repository) {
      await postErrorToIssue(
        options.repository,
        issueNumber,
        error.message,
        options.githubToken
      );
    }

    throw error;
  }
}

/**
 * Issue本文を解析してAWSケースデータに変換
 */
function parseIssueBody(issueBody) {
  const lines = issueBody.split('\n');
  const data = {
    subject: '',
    body: '',
    severity: 'low',
    category: 'other',
    serviceCode: 'general-info'
  };

  let currentSection = null;
  const sections = {};

  for (const line of lines) {
    // Markdown見出しを検出
    if (line.startsWith('###')) {
      currentSection = line.replace(/^###\s*/, '').trim();
      sections[currentSection] = [];
      continue;
    }

    if (currentSection && line.trim()) {
      sections[currentSection].push(line.trim());
    }
  }

  // セクションからデータを抽出
  if (sections['事象の概要']) {
    data.subject = sections['事象の概要'].join(' ').substring(0, 100);
  }

  // 本文を構築
  const bodyParts = [];
  if (sections['詳細説明']) {
    bodyParts.push('## 詳細説明');
    bodyParts.push(sections['詳細説明'].join('\n'));
  }
  if (sections['再現手順']) {
    bodyParts.push('\n## 再現手順');
    bodyParts.push(sections['再現手順'].join('\n'));
  }
  if (sections['試した対処方法']) {
    bodyParts.push('\n## 試した対処方法');
    bodyParts.push(sections['試した対処方法'].join('\n'));
  }
  data.body = bodyParts.join('\n');

  // 重要度をマッピング
  if (sections['重要度']) {
    const severityText = sections['重要度'][0] || '';
    if (severityText.includes('Critical') || severityText.includes('緊急')) {
      data.severity = 'urgent';
    } else if (severityText.includes('High') || severityText.includes('高')) {
      data.severity = 'high';
    } else if (severityText.includes('Normal') || severityText.includes('通常')) {
      data.severity = 'normal';
    } else {
      data.severity = 'low';
    }
  }

  // AWSサービスコードをマッピング
  if (sections['対象AWSサービス']) {
    const service = sections['対象AWSサービス'][0] || '';
    data.serviceCode = mapServiceCode(service);
  }

  return data;
}

/**
 * AWSサービス名をサービスコードにマッピング
 */
function mapServiceCode(serviceName) {
  const mapping = {
    'EC2': 'amazon-elastic-compute-cloud-linux',
    'RDS': 'amazon-relational-database-service',
    'S3': 'amazon-simple-storage-service',
    'Lambda': 'aws-lambda',
    'ECS': 'amazon-elastic-container-service',
    'CloudFront': 'amazon-cloudfront',
    'Route53': 'amazon-route53',
    'VPC': 'amazon-virtual-private-cloud'
  };

  return mapping[serviceName] || 'general-info';
}

/**
 * GitHub IssueにケースIDを投稿
 */
async function postCaseIdToIssue(repository, issueNumber, caseId, displayId, githubToken) {
  const [owner, repo] = repository.split('/');

  const commentBody = `## ✅ AWSサポートケース作成完了

AWSサポートケースが正常に作成されました。

### ケース情報
- **Case ID**: \`${caseId}\`
- **Display ID**: \`${displayId || caseId}\`
- **作成日時**: ${new Date().toISOString()}

### 次のステップ
1. AWS Support Center で進捗を確認
2. AWSからの回答は自動的にこのIssueに同期されます
3. 返信する場合: このIssueにコメントで \`/reply [メッセージ]\` を記入

---

*このコメントは自動生成されました*
*ケース監視は15分ごとに実行されます*
`;

  return postToGitHub(owner, repo, issueNumber, commentBody, githubToken);
}

/**
 * GitHub Issueにエラーを投稿
 */
async function postErrorToIssue(repository, issueNumber, errorMessage, githubToken) {
  const [owner, repo] = repository.split('/');

  const commentBody = `## ❌ AWSサポートケース作成失敗

AWSサポートケースの作成に失敗しました。

### エラー内容
\`\`\`
${errorMessage}
\`\`\`

### 対処方法
1. **AWS認証情報を確認**: \`~/.aws/credentials\` が正しく設定されているか
2. **AWS Support プランを確認**: Business/Enterprise プランが必要です
3. **IAM権限を確認**: \`support:CreateCase\` 権限があるか

### トラブルシューティング
- [AWS認証情報設定ガイド](../docs/AWS_SUPPORT_API_INTEGRATION.md)
- エラーが続く場合: Issueにコメントしてください

---

*このエラーは自動検出されました*
*発生日時: ${new Date().toISOString()}*
`;

  return postToGitHub(owner, repo, issueNumber, commentBody, githubToken);
}

/**
 * GitHub APIにコメントを投稿
 */
function postToGitHub(owner, repo, issueNumber, body, githubToken) {
  const data = JSON.stringify({ body });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'AWS-Support-Bot',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseBody));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} ${responseBody}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * メイン処理
 */
async function main() {
  const issueBody = process.env.ISSUE_BODY;
  const issueNumber = process.env.ISSUE_NUMBER;
  const repository = process.env.GITHUB_REPOSITORY;
  const githubToken = process.env.GITHUB_TOKEN;
  const awsProfile = process.env.AWS_PROFILE || 'default';
  const mockMode = process.env.MOCK_MODE === 'true';

  if (!issueBody || !issueNumber) {
    console.error('❌ Error: ISSUE_BODY and ISSUE_NUMBER are required');
    process.exit(1);
  }

  try {
    await createSupportCaseFromIssue(issueBody, issueNumber, {
      githubToken,
      repository,
      awsProfile,
      mockMode
    });

    console.log('✅ Successfully created AWS Support case');
  } catch (error) {
    console.error('❌ Failed to create AWS Support case:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { createSupportCaseFromIssue, parseIssueBody };
