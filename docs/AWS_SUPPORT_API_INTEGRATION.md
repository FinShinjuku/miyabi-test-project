# AWS Support API 統合ガイド

## 🎯 概要

GitHub Issue と AWS Support Center を双方向連携させる機能の完全ガイドです。

### 実装機能

1. ✅ **AWSケース自動起票** - Issue作成時に自動でサポートケースを作成
2. ✅ **ケース状態監視** - 15分ごとにケース状態を自動チェック
3. ✅ **回答自動同期** - AWSからの回答をIssueコメントに自動投稿
4. ✅ **Issueから返信** - コメントで `/reply` を使ってAWSに返信
5. ✅ **モックモード** - AWS Support プランなしでテスト可能

---

## ⚠️ 前提条件

### 必須要件

| 項目 | 要件 | 確認方法 |
|-----|------|---------|
| **AWS Support プラン** | Business ($100/月~) または Enterprise ($15,000/月~) | AWS Console → Support Center |
| **AWS認証情報** | `~/.aws/credentials` に設定済み | `aws sts get-caller-identity` |
| **IAM権限** | `support:*` 権限 | IAMポリシー確認 |
| **GitHub リポジトリ** | Write権限 | Settings タブが見えるか確認 |

### AWS Support プランについて

⚠️ **重要**: AWS Support API は **Business** または **Enterprise** プランが必要です。

- **Developer プラン**: API アクセス不可
- **Basic プラン**: API アクセス不可

**モックモードで動作確認は可能**ですが、実際のAWS連携には上記プランの契約が必要です。

---

## 🔐 セットアップ

### 1. AWS認証情報の設定

#### ステップ1: AWS CLIのインストール

```bash
# macOS
brew install awscli

# Linux
sudo apt-get install awscli

# Windows
# AWS公式サイトからインストーラーをダウンロード
```

#### ステップ2: 認証情報の設定

```bash
aws configure --profile default
```

以下を入力:
```
AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name: us-east-1  # Support API は us-east-1 必須
Default output format: json
```

#### ステップ3: 認証確認

```bash
aws sts get-caller-identity
```

成功すれば以下のように表示:
```json
{
  "UserId": "AIDAI...",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/yourname"
}
```

### 2. IAMポリシーの設定

**最小権限ポリシー**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "support:CreateCase",
        "support:DescribeCases",
        "support:AddCommunicationToCase",
        "support:DescribeCommunications"
      ],
      "Resource": "*"
    }
  ]
}
```

**適用方法**:
1. IAM Console → Users → [あなたのユーザー]
2. "Add inline policy" をクリック
3. 上記JSONを貼り付け
4. 名前を `AWSSupportAccess` として保存

### 3. GitHub Secretsの設定

**不要**: このシステムはローカルの `~/.aws/credentials` を使用するため、GitHub Secretsに認証情報を保存しません。

---

## 📝 使い方

### 1. AWSケースを自動起票

#### ステップ1: Issueを作成

「AWS サポート問い合わせ」テンプレートを使用してIssue作成:

```markdown
### 問い合わせカテゴリ
障害調査

### 重要度
Critical（緊急）

### 対象AWSサービス
EC2

### 事象の概要
EC2インスタンスが起動しない

### 詳細説明
- 発生日時: 2025-10-24 10:00 JST
- インスタンスID: i-0123456789abcdef
- エラー: InsufficientInstanceCapacity

### 再現手順
1. EC2コンソールを開く
2. 「インスタンスを起動」をクリック
3. t3.largeを選択
4. エラーが発生
```

#### ステップ2: ラベルを追加

- `aws-support` ラベルを付与

#### ステップ3: 自動実行を確認

GitHub Actions が自動起動し、約30秒後にIssueコメントが投稿されます:

```
✅ AWSサポートケース作成完了

Case ID: case-12345678-abcd-1234-5678-123456789abc
Display ID: CASE-12345678
```

### 2. AWSからの回答を受信

**自動実行**: 15分ごとにケース状態を監視し、新しい回答があれば自動的にIssueコメントに投稿されます。

**回答例**:
```
💬 AWSサポートからの回答

Case ID: CASE-12345678
回答者: AWS Support
日時: 2025-10-24T12:30:00Z

## 回答内容

お問い合わせありがとうございます。

InsufficientInstanceCapacity エラーは、選択されたAZで
一時的にキャパシティ不足が発生している場合に表示されます。

以下をお試しください:
1. 別のインスタンスタイプ（t3.medium等）で起動
2. 別のAZで起動
3. 数時間後に再試行
```

### 3. AWSサポートに返信

#### ステップ1: Issueコメントで返信

```markdown
/reply 別のAZで試したところ、正常に起動できました。ありがとうございます。
```

#### ステップ2: 自動送信確認

GitHub Actions が自動的にAWSに返信し、確認コメントが投稿されます:

```
✅ AWSサポートへの返信完了

Case ID: CASE-12345678

送信内容:
別のAZで試したところ、正常に起動できました。ありがとうございます。
```

---

## 🧪 モックモードでのテスト

AWS Support プランがない場合、モックモードで動作確認できます。

### モックモードの有効化

`.github/workflows/aws-support-sync.yml` で:

```yaml
env:
  MOCK_MODE: 'true'  # モックモード有効化
```

### モックモードの動作

- ✅ 実際のAPI呼び出しは行わない
- ✅ ダミーのCase IDを生成
- ✅ ダミーの回答を返す
- ✅ GitHub連携のテストが可能

### ローカルテスト

```bash
# モックモードでケース作成テスト
MOCK_MODE=true \
ISSUE_BODY="Test issue" \
ISSUE_NUMBER=123 \
GITHUB_REPOSITORY=owner/repo \
node scripts/create-support-case.js

# モックモードで監視テスト
MOCK_MODE=true \
GITHUB_REPOSITORY=owner/repo \
node scripts/monitor-cases.js
```

---

## 🔧 トラブルシューティング

### エラー1: AWS認証情報が見つからない

**症状**:
```
Error: AWS credentials file not found: ~/.aws/credentials
```

**解決策**:
```bash
aws configure
```

### エラー2: IAM権限不足

**症状**:
```
Error: User is not authorized to perform: support:CreateCase
```

**解決策**:
1. IAM Console でユーザーのポリシーを確認
2. 上記「IAMポリシーの設定」を参照して権限を追加

### エラー3: AWS Support プラン未契約

**症状**:
```
Error: SubscriptionRequiredException: AWS Support API requires Business or Enterprise plan
```

**解決策**:
- Option A: AWS Business Support プランを契約（$100/月~）
- Option B: モックモードで継続使用

### エラー4: Case IDが見つからない

**症状**:
```
[TODO] Implement GitHub Search for caseId
```

**原因**: GitHub Search API の実装が未完成

**暫定対処**:
1. Issueコメントから手動でCase IDを確認
2. 環境変数 `CASE_ID` を手動設定

---

## 📊 システムアーキテクチャ

```
GitHub Issue
    ↓
[Issue作成] → create-support-case.js
    ↓
AWS Support API (CreateCase)
    ↓
Case ID を Issue に保存
    ↓
[15分ごと] → monitor-cases.js
    ↓
AWS Support API (DescribeCases)
    ↓
新しい回答を Issue に投稿
    ↓
[コメント追加] → reply-to-case.js
    ↓
AWS Support API (AddCommunicationToCase)
    ↓
確認コメント投稿
```

---

## 🔒 セキュリティ

### 認証情報の管理

✅ **ローカルストレージ**: `~/.aws/credentials` のみ使用
✅ **GitHub Secrets 不使用**: 認証情報をGitHubに保存しない
✅ **IAM最小権限**: Support API のみに権限を限定

### ログサニタイゼーション

すべてのスクリプトで以下を実施:
- ✅ API KeyやSecretはログに出力しない
- ✅ エラーメッセージから機密情報を除去
- ✅ GitHub コメントに認証情報を含めない

---

## 📚 ファイル構成

| ファイル | 役割 | 行数 |
|---------|------|------|
| `scripts/aws-support-client.js` | AWS SDK クライアント基盤 | 270 |
| `scripts/create-support-case.js` | ケース自動起票 | 250 |
| `scripts/monitor-cases.js` | ケース監視・回答同期 | 280 |
| `scripts/reply-to-case.js` | Issue から返信送信 | 200 |
| `.github/workflows/aws-support-sync.yml` | GitHub Actions ワークフロー | 130 |
| `tests/aws-support.test.js` | モックテスト | 200 |
| **合計** | **6ファイル** | **1,330行** |

---

## 🚀 将来の拡張

### Phase 2 予定機能

- [ ] GitHub Search API 統合（Case ID自動検索）
- [ ] ケース詳細ページへのリンク自動生成
- [ ] メール通知統合
- [ ] Slack通知統合
- [ ] ダッシュボード（統計・履歴）

### Phase 3 予定機能

- [ ] 複数AWSアカウント対応
- [ ] Auto-escalation（緊急度に応じた自動エスカレーション）
- [ ] ナレッジベース統合（過去の類似ケース提案）

---

## 🆘 サポート

質問がある場合:

1. ✅ このドキュメントを確認
2. ✅ GitHub Issue で質問
3. ✅ AWS公式サポートに問い合わせ（AWS Support プラン契約者のみ）

---

🌸 **Miyabi Autonomous Operations** - Beauty in Autonomous Development

*AWS Support API 統合ドキュメント*
*最終更新: 2025-10-24*
