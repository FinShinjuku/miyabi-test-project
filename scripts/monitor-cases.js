#!/usr/bin/env node

/**
 * AWS Support Case Monitor
 *
 * AWSサポートケースの状態を定期的に監視し、
 * 変更があった場合にGitHub Issueに通知
 */

const { AWSSupportClient } = require('./aws-support-client');
const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * すべてのオープンケースを監視
 */
async function monitorAllCases(options = {}) {
  const {
    githubToken,
    repository,
    awsProfile = 'default',
    mockMode = false,
    stateFile = '.aws-case-state.json'
  } = options;

  try {
    console.log('🔍 Monitoring AWS Support cases...');

    // AWS Support Client初期化
    const client = new AWSSupportClient({
      profile: awsProfile,
      mockMode
    });

    // ケース一覧を取得
    const response = await client.describeCases({
      includeResolvedCases: false, // オープンケースのみ
      maxResults: 100
    });

    console.log(`📊 Found ${response.cases ? response.cases.length : 0} open cases`);

    // 前回の状態を読み込み
    const previousState = loadState(stateFile);

    // 各ケースの変更をチェック
    for (const caseData of response.cases || []) {
      await checkCaseChanges(caseData, previousState, {
        githubToken,
        repository
      });
    }

    // 現在の状態を保存
    saveState(stateFile, response.cases || []);

    console.log('✅ Monitoring completed');

  } catch (error) {
    console.error('❌ Error monitoring cases:', error.message);
    throw error;
  }
}

/**
 * 個別ケースの変更をチェック
 */
async function checkCaseChanges(caseData, previousState, options) {
  const caseId = caseData.caseId;
  const previousCase = previousState[caseId];

  if (!previousCase) {
    console.log(`🆕 New case detected: ${caseId}`);
    return; // 新規ケースは通知不要（作成時に通知済み）
  }

  // 状態変更をチェック
  if (caseData.status !== previousCase.status) {
    console.log(`📝 Status changed for ${caseId}: ${previousCase.status} → ${caseData.status}`);

    if (options.githubToken && options.repository) {
      await notifyStatusChange(caseData, previousCase, options);
    }
  }

  // 新しいコミュニケーションをチェック
  const newCommunications = getNewCommunications(caseData, previousCase);
  if (newCommunications.length > 0) {
    console.log(`💬 ${newCommunications.length} new communication(s) for ${caseId}`);

    if (options.githubToken && options.repository) {
      await notifyNewCommunications(caseData, newCommunications, options);
    }
  }
}

/**
 * 新しいコミュニケーションを抽出
 */
function getNewCommunications(currentCase, previousCase) {
  const currentComms = currentCase.recentCommunications?.communications || [];
  const previousComms = previousCase.recentCommunications?.communications || [];

  const previousTimes = new Set(previousComms.map(c => c.timeCreated));

  return currentComms.filter(c => !previousTimes.has(c.timeCreated));
}

/**
 * 状態変更をGitHub Issueに通知
 */
async function notifyStatusChange(caseData, previousCase, options) {
  const issueNumber = findIssueNumber(caseData.caseId, options.repository);
  if (!issueNumber) {
    console.log(`⚠️  Issue not found for case ${caseData.caseId}`);
    return;
  }

  const commentBody = `## 📊 AWSサポートケース状態変更

**Case ID**: \`${caseData.displayId || caseData.caseId}\`

### 状態変更
- **前回**: ${formatStatus(previousCase.status)}
- **現在**: ${formatStatus(caseData.status)}
- **変更日時**: ${new Date().toISOString()}

### 次のステップ
${getNextStepsForStatus(caseData.status)}

---

*このコメントは自動生成されました*
*ケース監視: 15分ごとに実行*
`;

  await postCommentToIssue(issueNumber, commentBody, options);
}

/**
 * 新しいコミュニケーションをGitHub Issueに投稿
 */
async function notifyNewCommunications(caseData, communications, options) {
  const issueNumber = findIssueNumber(caseData.caseId, options.repository);
  if (!issueNumber) {
    console.log(`⚠️  Issue not found for case ${caseData.caseId}`);
    return;
  }

  for (const comm of communications) {
    const commentBody = `## 💬 AWSサポートからの回答

**Case ID**: \`${caseData.displayId || caseData.caseId}\`
**回答者**: ${comm.submittedBy || 'AWS Support'}
**日時**: ${comm.timeCreated}

### 回答内容

${comm.body}

---

### 返信する場合
このIssueにコメントで以下のように記入してください:
\`\`\`
/reply [あなたのメッセージ]
\`\`\`

---

*このコメントは自動生成されました*
*AWSサポートからの回答を自動同期しています*
`;

    await postCommentToIssue(issueNumber, commentBody, options);
  }
}

/**
 * ケースIDから対応するIssue番号を検索
 *
 * 実装方法:
 * 1. GitHub Search API でケースIDを含むIssueを検索
 * 2. または、Issue本文/コメントにケースIDが記載されているものを探す
 *
 * 簡易実装: ケースIDをIssue番号にマッピング（モック）
 */
function findIssueNumber(caseId, repository) {
  // TODO: 実際の実装では GitHub Search API を使用
  // 例: GET /search/issues?q=repo:owner/repo+${caseId}

  // モック実装: ケースIDから推定
  // 実運用では、ケース作成時にIssue番号をメタデータに保存する
  console.log(`[TODO] Implement GitHub Search for caseId: ${caseId}`);
  return null; // 実装が必要
}

/**
 * GitHub Issueにコメントを投稿
 */
async function postCommentToIssue(issueNumber, body, options) {
  const { githubToken, repository } = options;
  const [owner, repo] = repository.split('/');

  const data = JSON.stringify({ body });

  const requestOptions = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'AWS-Support-Monitor',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(requestOptions, (res) => {
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
 * 状態をフォーマット
 */
function formatStatus(status) {
  const statusMap = {
    'opened': '🟢 オープン',
    'pending-customer-action': '🟡 顧客対応待ち',
    'reopened': '🔄 再オープン',
    'resolved': '✅ 解決済み',
    'unassigned': '⚪ 未割当'
  };
  return statusMap[status] || status;
}

/**
 * 状態に応じた次のステップを提案
 */
function getNextStepsForStatus(status) {
  const steps = {
    'opened': '- AWSサポートからの初回応答を待ってください',
    'pending-customer-action': '- AWSサポートが追加情報を求めています\n- このIssueにコメントで `/reply` を使って返信してください',
    'reopened': '- ケースが再オープンされました\n- AWSサポートからの追加回答を待ってください',
    'resolved': '- ケースが解決されました\n- 問題が解決していない場合は `/reply` で再オープンできます',
    'unassigned': '- ケースが割り当て待ちです\n- しばらくお待ちください'
  };
  return steps[status] || '- AWSサポートからの連絡を待ってください';
}

/**
 * 前回の状態を読み込み
 */
function loadState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      const cases = JSON.parse(data);
      const state = {};
      for (const c of cases) {
        state[c.caseId] = c;
      }
      return state;
    }
  } catch (error) {
    console.warn(`⚠️  Failed to load state: ${error.message}`);
  }
  return {};
}

/**
 * 現在の状態を保存
 */
function saveState(stateFile, cases) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(cases, null, 2), 'utf8');
  } catch (error) {
    console.error(`❌ Failed to save state: ${error.message}`);
  }
}

/**
 * メイン処理
 */
async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const githubToken = process.env.GITHUB_TOKEN;
  const awsProfile = process.env.AWS_PROFILE || 'default';
  const mockMode = process.env.MOCK_MODE === 'true';

  try {
    await monitorAllCases({
      githubToken,
      repository,
      awsProfile,
      mockMode
    });
    console.log('✅ Monitoring completed successfully');
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { monitorAllCases, checkCaseChanges };
