#!/usr/bin/env node

/**
 * AWS Support Case Reply Script
 *
 * GitHub IssueコメントからAWSサポートケースに返信
 */

const { AWSSupportClient } = require('./aws-support-client');
const https = require('https');

/**
 * GitHub Issueコメントから AWSケースに返信
 * @param {string} commentBody - コメント本文
 * @param {string} caseId - AWS Case ID
 * @param {Object} options - オプション
 */
async function replyToCase(commentBody, caseId, options = {}) {
  const {
    githubToken,
    repository,
    issueNumber,
    awsProfile = 'default',
    mockMode = false
  } = options;

  try {
    console.log(`💬 Processing reply for case: ${caseId}`);

    // コメントから /reply コマンドを抽出
    const replyMessage = extractReplyMessage(commentBody);

    if (!replyMessage) {
      console.log('⚠️  No /reply command found in comment');
      return null;
    }

    console.log(`📝 Reply message: ${replyMessage.substring(0, 50)}...`);

    // AWS Support Client初期化
    const client = new AWSSupportClient({
      profile: awsProfile,
      mockMode
    });

    // AWSケースに返信を追加
    console.log('🚀 Adding communication to AWS case...');
    const result = await client.addCommunicationToCase(caseId, replyMessage);

    console.log('✅ Reply sent to AWS Support');

    // GitHub Issueに確認コメントを投稿
    if (githubToken && repository && issueNumber) {
      await postReplyConfirmation(
        repository,
        issueNumber,
        caseId,
        replyMessage,
        githubToken
      );
    }

    return result;

  } catch (error) {
    console.error('❌ Error sending reply:', error.message);

    // GitHub Issueにエラー通知
    if (options.githubToken && options.repository && options.issueNumber) {
      await postReplyError(
        options.repository,
        options.issueNumber,
        caseId,
        error.message,
        options.githubToken
      );
    }

    throw error;
  }
}

/**
 * コメント本文から /reply コマンドを抽出
 */
function extractReplyMessage(commentBody) {
  // /reply で始まる行を検出
  const lines = commentBody.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('/reply')) {
      // /reply に続くテキストを取得
      const message = trimmed.substring(6).trim();
      if (message) {
        return message;
      }
    }
  }

  // マルチライン形式も対応
  // ```
  // /reply
  // メッセージ本文
  // ```
  const replyMatch = commentBody.match(/\/reply\s+([\s\S]+?)(?:```|$)/);
  if (replyMatch && replyMatch[1]) {
    return replyMatch[1].trim();
  }

  return null;
}

/**
 * GitHub Issueに返信確認コメントを投稿
 */
async function postReplyConfirmation(repository, issueNumber, caseId, message, githubToken) {
  const commentBody = `## ✅ AWSサポートへの返信完了

**Case ID**: \`${caseId}\`

### 送信内容
\`\`\`
${message}
\`\`\`

### 送信情報
- **送信日時**: ${new Date().toISOString()}
- **送信元**: GitHub Issue #${issueNumber}

### 次のステップ
- AWSサポートからの返答を待ってください
- 返答は自動的にこのIssueに同期されます（15分ごとの監視）

---

*このコメントは自動生成されました*
`;

  return postToGitHub(repository, issueNumber, commentBody, githubToken);
}

/**
 * GitHub Issueにエラーを投稿
 */
async function postReplyError(repository, issueNumber, caseId, errorMessage, githubToken) {
  const commentBody = `## ❌ AWSサポートへの返信失敗

**Case ID**: \`${caseId}\`

### エラー内容
\`\`\`
${errorMessage}
\`\`\`

### 対処方法
1. **AWS認証情報を確認**: \`~/.aws/credentials\` が正しく設定されているか
2. **Case IDを確認**: ケースが存在するか、クローズされていないか
3. **IAM権限を確認**: \`support:AddCommunicationToCase\` 権限があるか

### 再試行
もう一度 \`/reply [メッセージ]\` でコメントしてください。

---

*このエラーは自動検出されました*
*発生日時: ${new Date().toISOString()}*
`;

  return postToGitHub(repository, issueNumber, commentBody, githubToken);
}

/**
 * GitHub APIにコメントを投稿
 */
function postToGitHub(repository, issueNumber, body, githubToken) {
  const [owner, repo] = repository.split('/');
  const data = JSON.stringify({ body });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'AWS-Support-Reply-Bot',
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
  const commentBody = process.env.COMMENT_BODY;
  const caseId = process.env.CASE_ID;
  const issueNumber = process.env.ISSUE_NUMBER;
  const repository = process.env.GITHUB_REPOSITORY;
  const githubToken = process.env.GITHUB_TOKEN;
  const awsProfile = process.env.AWS_PROFILE || 'default';
  const mockMode = process.env.MOCK_MODE === 'true';

  if (!commentBody || !caseId) {
    console.error('❌ Error: COMMENT_BODY and CASE_ID are required');
    process.exit(1);
  }

  try {
    await replyToCase(commentBody, caseId, {
      githubToken,
      repository,
      issueNumber,
      awsProfile,
      mockMode
    });

    console.log('✅ Successfully sent reply to AWS Support');
  } catch (error) {
    console.error('❌ Failed to send reply:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { replyToCase, extractReplyMessage };
