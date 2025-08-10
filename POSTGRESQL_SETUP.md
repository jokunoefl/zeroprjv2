# PostgreSQL設定手順

## RailwayでのPostgreSQL設定

### 1. PostgreSQLデータベースの追加

1. **Railwayダッシュボードにアクセス**
   - https://railway.app/dashboard にアクセス
   - プロジェクト `zeroprjv2` を選択

2. **データベースを追加**
   - 「New」ボタンをクリック
   - 「Database」を選択
   - 「PostgreSQL」を選択

3. **データベース設定**
   - **Name**: `zerobasics-db` (推奨)
   - **Region**: アプリケーションと同じリージョンを選択
   - 「Deploy Database」をクリック

### 2. 環境変数の確認

Railwayは自動的に以下の環境変数を設定します：
- `DATABASE_URL`: PostgreSQL接続文字列
- `PGHOST`: データベースホスト
- `PGPORT`: データベースポート
- `PGUSER`: データベースユーザー
- `PGPASSWORD`: データベースパスワード
- `PGDATABASE`: データベース名

### 3. アプリケーションの再デプロイ

データベースが追加されると、アプリケーションが自動的に再デプロイされます。

## ローカルでのPostgreSQLテスト

### 1. PostgreSQLのインストール

**macOS (Homebrew)**:
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. データベースの作成

```bash
# PostgreSQLに接続
sudo -u postgres psql

# データベースとユーザーを作成
CREATE DATABASE zerobasics;
CREATE USER zerobasics_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE zerobasics TO zerobasics_user;
\q
```

### 3. 環境変数の設定

```bash
export DATABASE_URL="postgresql://zerobasics_user:your_password@localhost:5432/zerobasics"
```

### 4. マイグレーションの実行

```bash
cd backend
python migrate.py
```

## データベースの確認

### 1. Railwayでの確認

1. **Railwayダッシュボード**でデータベースを選択
2. **「Connect」タブ**で接続情報を確認
3. **「Data」タブ**でテーブルとデータを確認

### 2. アプリケーションでの確認

```bash
# ヘルスチェック
curl https://zeroprjv2-production.up.railway.app/health

# テーブル確認
curl https://zeroprjv2-production.up.railway.app/check-tables

# データベース初期化（必要に応じて）
curl -X POST https://zeroprjv2-production.up.railway.app/init-db
```

## トラブルシューティング

### 1. 接続エラー

**エラー**: `connection refused`
**解決策**: 
- Railwayダッシュボードでデータベースが起動しているか確認
- 環境変数`DATABASE_URL`が正しく設定されているか確認

### 2. 認証エラー

**エラー**: `authentication failed`
**解決策**:
- Railwayダッシュボードでデータベースの認証情報を確認
- 環境変数が正しく設定されているか確認

### 3. テーブル作成エラー

**エラー**: `permission denied`
**解決策**:
- データベースユーザーに適切な権限が付与されているか確認
- Railwayの無料プランの制限を確認

## パフォーマンス最適化

### 1. 接続プール設定

`backend/app/db.py`で接続プールを調整：

```python
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20
)
```

### 2. インデックスの追加

重要なクエリのパフォーマンス向上のため、インデックスを追加：

```sql
-- 例：questionsテーブルのsubjectとtopicにインデックス
CREATE INDEX idx_questions_subject_topic ON questions(subject, topic);

-- 例：masteryテーブルのuser_idとnext_review_atにインデックス
CREATE INDEX idx_mastery_user_next_review ON mastery(user_id, next_review_at);
```

## バックアップと復元

### 1. データベースのバックアップ

```bash
# Railwayでのバックアップ
# Railwayダッシュボード → データベース → 「Backup」タブ

# ローカルでのバックアップ
pg_dump $DATABASE_URL > backup.sql
```

### 2. データベースの復元

```bash
# ローカルでの復元
psql $DATABASE_URL < backup.sql
```

## セキュリティ

### 1. 環境変数の管理

- 本番環境では強力なパスワードを使用
- 環境変数をGitにコミットしない
- Railwayの環境変数機能を使用

### 2. 接続の暗号化

RailwayのPostgreSQLは自動的にSSL暗号化を使用します。

## 監視とログ

### 1. Railwayでの監視

- Railwayダッシュボードでデータベースの使用量を監視
- 接続数、クエリ数、エラー数を確認

### 2. アプリケーションログ

```bash
# Railwayでのログ確認
railway logs

# 特定のサービスのログ
railway logs --service zerobasics-api
```
