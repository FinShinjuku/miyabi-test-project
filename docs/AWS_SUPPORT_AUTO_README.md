# AWSサポートやりとりくん（MVP版）

## 🎯 概要

GitHub Issueを使ってAWSサポートへの問い合わせを**AI自動生成**する実証実験用システムです。

開発者や運用担当がGitHub Issueを作成するだけで、AIが自動的に整形された問い合わせ文を生成してコメントに投稿します。

## ✨ 機能（MVP版）

### ✅ 実装済み

1. **GitHub Issue template** - 構造化されたAWSサポート問い合わせフォーム
2. **AI問い合わせ生成** - OpenAI/Claude APIを使った自動生成
3. **自動コメント投稿** - 生成された問い合わせ文をIssueコメントに投稿
4. **GitHub Actions連携** - Issue作成時に自動実行

### 🚫 未実装（将来版）

- AWS Support Center API統合（実際のAWS APIへの送信）
- GitHub Project統合（ナレッジベース管理）
- 類似問い合わせ提案
- 高度な自動カテゴリ分類

## 🚀 セットアップ

### 1. 必要な環境

- GitHub リポジトリ
- OpenAI APIキー または Claude APIキー
- GitHub Actions有効化

### 2. GitHub Secretsの設定

リポジトリの Settings > Secrets and variables > Actions で以下を追加：

**OpenAI使用時**:
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Claude使用時**:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. ラベルの作成

リポジトリに以下のラベルを作成：

- `aws-support` - このラベルが付いたIssueのみ自動処理されます
- `🤖 ai-generated` - AI生成済みを示すラベル（自動付与）

### 4. ワークフローの有効化

`.github/workflows/aws-support-auto.yml` が自動的に有効になります。

## 📝 使い方

### 手順1: Issueを作成

1. GitHub リポジトリで「New Issue」をクリック
2. 「AWS サポート問い合わせ」テンプレートを選択
3. フォームに記入：
   - 問い合わせカテゴリ（障害調査/技術質問/etc.）
   - 重要度
   - 対象AWSサービス（EC2, RDS, Lambda, etc.）
   - 事象の概要
   - 詳細説明
   - 再現手順（任意）
   - 試した対処方法（任意）
4. 「Submit new issue」をクリック

### 手順2: AI自動生成を待つ

- GitHub Actionsが自動的に起動（約30秒〜1分）
- AIが問い合わせ文を生成
- Issueコメントに自動投稿

### 手順3: 生成された問い合わせ文を確認

- Issueコメントに投稿された問い合わせ文を確認
- 必要に応じて修正・追加
- AWSサポートコンソールにコピー＆ペースト

## 📋 使用例

### Issue作成例

```yaml
問い合わせカテゴリ: 障害調査
重要度: Critical（緊急）
対象AWSサービス: EC2
事象の概要: EC2インスタンスが起動しない

詳細説明:
- 発生日時: 2025-10-24 10:00 JST
- 影響範囲: 本番環境のWebサーバー3台
- エラーメッセージ: "InsufficientInstanceCapacity"

再現手順:
1. EC2コンソールから新規インスタンスを起動
2. インスタンスタイプ t3.large を選択
3. 起動ボタンをクリック
4. エラーが発生

試した対処方法:
- 別のAvailability Zoneで試行 → 同じエラー
- インスタンスタイプをt3.mediumに変更 → 改善せず
```

### AI生成される問い合わせ文の例

```markdown
## 件名
EC2インスタンス起動失敗（InsufficientInstanceCapacity）に関する緊急調査依頼

## 問題の概要
本番環境にてEC2インスタンス（t3.large）の起動が失敗し、
"InsufficientInstanceCapacity"エラーが発生しております。
現在、Webサーバー3台が停止しており、サービスに影響が出ています。

## 詳細な説明
- 発生日時: 2025-10-24 10:00 JST
- 対象サービス: Amazon EC2
- インスタンスタイプ: t3.large
- リージョン: ap-northeast-1（推定）
- エラーメッセージ: "InsufficientInstanceCapacity"
- 影響範囲: 本番環境のWebサーバー3台

## 再現手順
1. EC2コンソールから新規インスタンスを起動
2. インスタンスタイプ t3.large を選択
3. 起動ボタンをクリック
4. 上記エラーが発生し、起動に失敗

## 試した対処方法
以下の対処を試みましたが、問題は解決していません：
- 別のAvailability Zoneでの起動試行 → 同じエラーが発生
- インスタンスタイプをt3.mediumに変更 → 改善せず

## 期待される結果
- キャパシティ不足の原因特定
- 代替手段の提案（リザーブドインスタンス、別リージョンの使用等）
- 今後の予防策のアドバイス
```

## 🛠️ トラブルシューティング

### ワークフローが実行されない

**原因1**: `aws-support` ラベルが付いていない
→ Issue作成時にラベルを追加してください

**原因2**: GitHub Actions が無効化されている
→ Settings > Actions > General で有効化

### AI生成が失敗する

**原因1**: API Keyが設定されていない
→ GitHub Secrets に `OPENAI_API_KEY` または `ANTHROPIC_API_KEY` を設定

**原因2**: API利用制限に到達
→ OpenAI/ClaudeのダッシュボードでAPI利用状況を確認

**原因3**: Issue本文が空
→ テンプレートに従って必要項目を記入

### エラーログの確認方法

1. リポジトリの「Actions」タブを開く
2. 失敗したワークフローをクリック
3. ログを確認

## 🔒 セキュリティ

### API Keyの管理

- ✅ GitHub Secretsに保存（暗号化）
- ✅ ワークフローログに表示されない
- ❌ リポジトリコードにハードコードしない

### AWS認証情報

**MVP版では AWS Support Center API は使用しません**

将来版で実装する場合：
- AWS認証情報をGitHub Actions内に保存しない
- 外部秘密管理サービス（AWS Secrets Manager等）を使用
- IAMロールの最小権限原則を適用

## 📊 制限事項（MVP版）

1. **AWS APIへの自動送信なし** - 生成された問い合わせ文を手動でコピー＆ペースト必要
2. **単一リポジトリのみ** - 複数リポジトリ横断は未対応
3. **日本語のみ** - 多言語対応なし
4. **テンプレート固定** - カスタマイズ機能なし
5. **ナレッジベース未実装** - 過去の問い合わせ検索不可

## 🔮 将来実装予定（Phase 2以降）

- [ ] AWS Support Center API統合
- [ ] GitHub Project連携（ナレッジベース）
- [ ] 類似問い合わせ自動提案（ベクトル検索）
- [ ] 多言語対応
- [ ] カスタムテンプレート機能
- [ ] ダッシュボード（統計、履歴）

## 📚 参考資料

- [JAL×DX事例: AWSサポート問い合わせをBedrockで自動化](https://aws.amazon.com/jp/blogs/news/jaldx-solutions-awssupport-bedrock/)
- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- [OpenAI API ドキュメント](https://platform.openai.com/docs)
- [Claude API ドキュメント](https://docs.anthropic.com/)

## 🙋 サポート

問題が発生した場合：

1. Issueを作成（テンプレート: Bug report）
2. エラーログを添付
3. 再現手順を記述

---

**🌸 Miyabi Autonomous Operations** - Beauty in Autonomous Development

*This is an MVP (Minimum Viable Product) for proof of concept.*
