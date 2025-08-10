# Railway デプロイ手順

## 1. Railwayアカウントの作成
1. [railway.app](https://railway.app) にアクセス
2. GitHubアカウントでサインアップ

## 2. プロジェクトの作成
1. Railwayダッシュボードで "New Project" をクリック
2. "Deploy from GitHub repo" を選択
3. GitHubリポジトリ `jokunoefl/zeroprjv2` を選択

## 3. 環境変数の設定
Railwayダッシュボード → プロジェクト → Variables で以下を設定：

### 基本設定
```
PYTHON_VERSION=3.11.0
```

### データベース設定
#### SQLite（開発用）
```
DATABASE_URL=sqlite:///./zerobasics.db
```

#### PostgreSQL（本番用）
```
DATABASE_URL=postgresql://username:password@host:port/database
```

## 4. データベースの設定（推奨）
1. Railwayダッシュボードで "New" → "Database" → "PostgreSQL" を選択
2. データベースが作成されると、自動的に `DATABASE_URL` 環境変数が設定される

## 5. デプロイの確認
1. デプロイが完了すると、RailwayがURLを提供
2. ヘルスチェック: `{URL}/health`
3. APIドキュメント: `{URL}/docs`

## 6. トラブルシューティング

### Nixpacksビルドエラーが発生した場合
- プロジェクトルートに以下のファイルが存在することを確認：
  - `main.py` - Pythonプロジェクト認識用
  - `requirements.txt` - 依存関係
  - `runtime.txt` - Pythonバージョン指定
  - `setup.py` - プロジェクト設定

### デプロイエラーが発生した場合
1. Railwayダッシュボード → プロジェクト → Deployments でログを確認
2. 環境変数が正しく設定されているか確認
3. データベース接続が正常か確認

### データベース接続エラー
1. `DATABASE_URL` 環境変数を確認
2. PostgreSQLの場合、接続文字列の形式を確認
3. データベースが作成されているか確認

## 7. 本番環境での注意点
- 本番環境では PostgreSQL の使用を推奨
- 環境変数で機密情報を管理
- 定期的なバックアップの設定
- モニタリングとログの確認

## 8. スケーリング
Railwayダッシュボード → プロジェクト → Settings → Scale で：
- 最小レプリカ数: 1
- 最大レプリカ数: 3
- 自動スケーリングを有効化

## 9. ファイル構造
```
zeroprjv2/
├── main.py              # Railway用エントリーポイント
├── requirements.txt     # Python依存関係
├── runtime.txt         # Pythonバージョン指定
├── setup.py           # プロジェクト設定
├── railway.json       # Railway設定
├── backend/           # 実際のアプリケーション
│   └── app/
│       └── main.py    # FastAPIアプリケーション
└── frontend/          # Next.jsフロントエンド
```
