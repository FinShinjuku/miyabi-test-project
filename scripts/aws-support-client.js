#!/usr/bin/env node

/**
 * AWS Support API Client
 *
 * AWS Support Center API とのやり取りを管理するクライアント
 * 認証情報はローカル ~/.aws/credentials から読み込み
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * AWS Support Client クラス
 */
class AWSSupportClient {
  constructor(options = {}) {
    this.profile = options.profile || 'default';
    this.region = options.region || 'us-east-1'; // Support API は us-east-1 のみ
    this.credentials = null;
    this.mockMode = options.mockMode || false; // テスト用モック
  }

  /**
   * AWS認証情報を ~/.aws/credentials から読み込み
   */
  loadCredentials() {
    const credentialsPath = path.join(os.homedir(), '.aws', 'credentials');

    if (!fs.existsSync(credentialsPath)) {
      throw new Error(
        `AWS credentials file not found: ${credentialsPath}\n` +
        'Please configure AWS CLI with: aws configure'
      );
    }

    const content = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = this.parseCredentials(content, this.profile);

    if (!credentials) {
      throw new Error(
        `Profile '${this.profile}' not found in ${credentialsPath}\n` +
        'Available profiles: ' + this.getAvailableProfiles(content).join(', ')
      );
    }

    this.credentials = credentials;
    return credentials;
  }

  /**
   * AWS credentials ファイルをパース
   */
  parseCredentials(content, profile) {
    const lines = content.split('\n');
    let currentProfile = null;
    const credentials = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // プロファイル名
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentProfile = trimmed.slice(1, -1);
        continue;
      }

      // キー=値 のペア
      if (currentProfile && trimmed.includes('=')) {
        const [key, value] = trimmed.split('=').map(s => s.trim());
        if (currentProfile === profile) {
          credentials[key] = value;
        }
      }
    }

    if (!credentials.aws_access_key_id || !credentials.aws_secret_access_key) {
      return null;
    }

    return {
      accessKeyId: credentials.aws_access_key_id,
      secretAccessKey: credentials.aws_secret_access_key,
      sessionToken: credentials.aws_session_token // オプション
    };
  }

  /**
   * 利用可能なプロファイル一覧を取得
   */
  getAvailableProfiles(content) {
    const profiles = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        profiles.push(trimmed.slice(1, -1));
      }
    }

    return profiles;
  }

  /**
   * サポートケースを作成
   * @param {Object} caseData - ケース情報
   * @returns {Promise<Object>} 作成されたケース情報
   */
  async createCase(caseData) {
    if (this.mockMode) {
      return this.mockCreateCase(caseData);
    }

    // 実際のAWS SDK呼び出し（プラン契約後に有効化）
    // const { SupportClient, CreateCaseCommand } = require('@aws-sdk/client-support');
    //
    // if (!this.credentials) {
    //   this.loadCredentials();
    // }
    //
    // const client = new SupportClient({
    //   region: this.region,
    //   credentials: this.credentials
    // });
    //
    // const command = new CreateCaseCommand({
    //   subject: caseData.subject,
    //   communicationBody: caseData.body,
    //   severityCode: caseData.severity || 'low',
    //   categoryCode: caseData.category || 'other',
    //   serviceCode: caseData.serviceCode || 'general-info',
    //   language: 'ja'
    // });
    //
    // const response = await client.send(command);
    // return response;

    throw new Error(
      'AWS Support API は Business/Enterprise プランが必要です。\n' +
      'モックモードで実行する場合: new AWSSupportClient({ mockMode: true })'
    );
  }

  /**
   * ケース一覧を取得
   */
  async describeCases(options = {}) {
    if (this.mockMode) {
      return this.mockDescribeCases(options);
    }

    throw new Error(
      'AWS Support API は Business/Enterprise プランが必要です。\n' +
      'モックモードで実行する場合: new AWSSupportClient({ mockMode: true })'
    );
  }

  /**
   * ケースにコミュニケーションを追加（返信）
   */
  async addCommunicationToCase(caseId, communicationBody) {
    if (this.mockMode) {
      return this.mockAddCommunication(caseId, communicationBody);
    }

    throw new Error(
      'AWS Support API は Business/Enterprise プランが必要です。\n' +
      'モックモードで実行する場合: new AWSSupportClient({ mockMode: true })'
    );
  }

  // ===== モック実装（テスト用） =====

  mockCreateCase(caseData) {
    const caseId = `case-mock-${Date.now()}`;
    console.log(`[MOCK] Creating case: ${caseData.subject}`);
    return Promise.resolve({
      caseId,
      displayId: `CASE-${caseId.slice(-8).toUpperCase()}`
    });
  }

  mockDescribeCases(options) {
    console.log('[MOCK] Describing cases');
    return Promise.resolve({
      cases: [
        {
          caseId: 'case-mock-12345',
          displayId: 'CASE-12345',
          subject: 'Test EC2 Issue',
          status: 'opened',
          timeCreated: new Date().toISOString(),
          recentCommunications: {
            communications: [
              {
                body: 'This is a test case response from AWS Support.',
                timeCreated: new Date().toISOString(),
                submittedBy: 'AWS Support'
              }
            ]
          }
        }
      ]
    });
  }

  mockAddCommunication(caseId, communicationBody) {
    console.log(`[MOCK] Adding communication to case ${caseId}`);
    return Promise.resolve({
      result: true
    });
  }
}

module.exports = { AWSSupportClient };

// CLI実行時のテスト
if (require.main === module) {
  const client = new AWSSupportClient({ mockMode: true });

  console.log('🧪 AWS Support Client Test (Mock Mode)\n');

  // モックテスト
  (async () => {
    try {
      // ケース作成テスト
      const newCase = await client.createCase({
        subject: 'Test EC2 Instance Issue',
        body: 'EC2 instance fails to start with InsufficientInstanceCapacity error.',
        severity: 'low'
      });
      console.log('✅ Create Case:', newCase);

      // ケース一覧取得テスト
      const cases = await client.describeCases();
      console.log('✅ Describe Cases:', cases);

      // 返信テスト
      const reply = await client.addCommunicationToCase('case-mock-12345', 'Thank you for your response.');
      console.log('✅ Add Communication:', reply);

      console.log('\n✅ All tests passed (Mock Mode)');
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}
