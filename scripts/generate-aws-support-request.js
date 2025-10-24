#!/usr/bin/env node

/**
 * AWS Support Request Generator (MVP)
 *
 * GitHub IssueからAWSサポート向けの問い合わせ文を自動生成します。
 * OpenAI APIまたはClaude APIを使用してAI駆動の文章生成を行います。
 */

const https = require('https');

/**
 * Issue本文からAWSサポート問い合わせ文を生成
 * @param {string} issueBody - GitHub Issue本文
 * @param {string} apiKey - OpenAI APIキーまたはClaude APIキー
 * @param {string} provider - AIプロバイダー ('openai' or 'claude')
 * @returns {Promise<string>} 生成された問い合わせ文
 */
async function generateSupportRequest(issueBody, apiKey, provider = 'openai') {
  const prompt = `
あなたはAWSサポートへの問い合わせを作成する専門家です。
以下のGitHub Issueの内容から、AWSサポートチームに送信するための
明確で構造化された問い合わせ文を日本語で生成してください。

問い合わせ文には以下を含めてください：
- 件名
- 問題の概要
- 詳細な説明
- 再現手順（該当する場合）
- 試した対処方法（該当する場合）
- 期待される結果

フォーマット: Markdown形式で出力してください。

GitHub Issue本文:
${issueBody}
`;

  if (provider === 'openai') {
    return await callOpenAI(prompt, apiKey);
  } else if (provider === 'claude') {
    return await callClaude(prompt, apiKey);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * OpenAI API呼び出し（リトライ機能付き）
 */
async function callOpenAI(prompt, apiKey, retryCount = 0, maxRetries = 3) {
  const data = JSON.stringify({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'あなたはAWSサポート問い合わせの専門家です。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', async () => {
        try {
          const response = JSON.parse(body);

          // レート制限エラー（429）の検出
          if (res.statusCode === 429 && retryCount < maxRetries) {
            const retryAfter = parseInt(res.headers['retry-after']) || Math.pow(2, retryCount) * 1000;
            console.log(`⏳ Rate limit hit. Retrying after ${retryAfter}ms (attempt ${retryCount + 1}/${maxRetries})`);

            await new Promise(resolve => setTimeout(resolve, retryAfter));

            // リトライ
            try {
              const result = await callOpenAI(prompt, apiKey, retryCount + 1, maxRetries);
              resolve(result);
            } catch (error) {
              reject(error);
            }
            return;
          }

          if (response.error) {
            const error = new Error(response.error.message || 'OpenAI API error');
            error.type = response.error.type;
            error.statusCode = res.statusCode;
            reject(error);
          } else {
            resolve(response.choices[0].message.content);
          }
        } catch (error) {
          error.statusCode = res.statusCode;
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Claude API呼び出し（リトライ機能付き）
 */
async function callClaude(prompt, apiKey, retryCount = 0, maxRetries = 3) {
  const data = JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', async () => {
        try {
          const response = JSON.parse(body);

          // レート制限エラー（429）の検出
          if (res.statusCode === 429 && retryCount < maxRetries) {
            const retryAfter = parseInt(res.headers['retry-after']) || Math.pow(2, retryCount) * 1000;
            console.log(`⏳ Rate limit hit. Retrying after ${retryAfter}ms (attempt ${retryCount + 1}/${maxRetries})`);

            await new Promise(resolve => setTimeout(resolve, retryAfter));

            // リトライ
            try {
              const result = await callClaude(prompt, apiKey, retryCount + 1, maxRetries);
              resolve(result);
            } catch (error) {
              reject(error);
            }
            return;
          }

          if (response.error) {
            const error = new Error(response.error.message || 'Claude API error');
            error.type = response.error.type;
            error.statusCode = res.statusCode;
            reject(error);
          } else {
            resolve(response.content[0].text);
          }
        } catch (error) {
          error.statusCode = res.statusCode;
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * GitHub Issueにコメントを投稿
 */
async function postIssueComment(owner, repo, issueNumber, comment, githubToken) {
  const data = JSON.stringify({ body: comment });

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
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} ${body}`));
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
  try {
    // 環境変数から設定を取得
    const issueBody = process.env.ISSUE_BODY;
    const issueNumber = process.env.ISSUE_NUMBER;
    const repository = process.env.GITHUB_REPOSITORY;
    const githubToken = process.env.GITHUB_TOKEN;
    const aiApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    const aiProvider = process.env.AI_PROVIDER || 'openai';

    if (!issueBody) {
      throw new Error('ISSUE_BODY environment variable is required');
    }
    if (!issueNumber) {
      throw new Error('ISSUE_NUMBER environment variable is required');
    }
    if (!repository) {
      throw new Error('GITHUB_REPOSITORY environment variable is required');
    }
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    if (!aiApiKey) {
      throw new Error('AI_API_KEY (or OPENAI_API_KEY/ANTHROPIC_API_KEY) environment variable is required');
    }

    console.log('🤖 AWS Support Request Generator (MVP)');
    console.log(`📝 Issue #${issueNumber}`);
    console.log(`🔧 AI Provider: ${aiProvider}`);

    // AI問い合わせ生成
    console.log('🧠 Generating support request with AI...');
    const supportRequest = await generateSupportRequest(issueBody, aiApiKey, aiProvider);

    // GitHub Issueにコメント投稿
    const [owner, repo] = repository.split('/');
    console.log('💬 Posting comment to GitHub Issue...');

    const commentBody = `## 🤖 AI生成 - AWSサポート問い合わせ文

以下の問い合わせ文が自動生成されました。内容を確認し、必要に応じて修正してからAWSサポートに送信してください。

---

${supportRequest}

---

*このコメントはAI（${aiProvider}）により自動生成されました。*
*生成日時: ${new Date().toISOString()}*
`;

    await postIssueComment(owner, repo, issueNumber, commentBody, githubToken);

    console.log('✅ Successfully generated and posted support request!');
    console.log(`📊 View comment: https://github.com/${repository}/issues/${issueNumber}`);

  } catch (error) {
    console.error('❌ Error:', error.message);

    // レート制限エラーの場合、Issueにコメントを投稿
    if (error.statusCode === 429) {
      try {
        const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
        const issueNumber = process.env.ISSUE_NUMBER;
        const githubToken = process.env.GITHUB_TOKEN;

        if (owner && repo && issueNumber && githubToken) {
          const rateLimitComment = `## ⏳ APIレート制限に到達しました

AI APIのレート制限に到達したため、問い合わせ文の生成を一時停止しました。

### 対処方法

**自動リトライ**: 制限解除後、以下のいずれかの方法で再実行できます:

1. **Issueを編集する** - 任意のフィールドを編集して保存すると、自動的に再実行されます
2. **手動再実行** - Actions タブから「Re-run jobs」をクリック
3. **コメントを追加** - \`/retry\` とコメントすると再実行（将来実装予定）

### エラー詳細

- エラータイプ: ${error.type || 'Rate Limit'}
- ステータスコード: ${error.statusCode}
- メッセージ: ${error.message}
- 発生日時: ${new Date().toISOString()}

しばらく待ってから再度お試しください。

---

*このエラーは自動的に検出され、コメントされました。*
`;

          await postIssueComment(owner, repo, issueNumber, rateLimitComment, githubToken);
          console.log('📝 Posted rate limit notice to Issue');
        }
      } catch (commentError) {
        console.error('Failed to post rate limit comment:', commentError.message);
      }
    }

    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { generateSupportRequest, postIssueComment };
