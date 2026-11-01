# GitHub Pages 公開構成

## 公開URL

| 環境 | ブランチ | パス |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/cycling-map/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/cycling-map/develop/ |

Settings → Pages → Build and deployment → Source は **GitHub Actions** に設定してください。

## ワークフロー

- `.github/workflows/validate-develop.yml`: developへのpushおよびPRでテストとビルドを実行。
- `.github/workflows/deploy-pages.yml`: mainへのpush、またはdevelopのCI成功で開始。両ブランチをビルドして1つのPages artifactに結合し、公開。
- `production/dist/` → artifactのルート、`preview/dist/` → `develop/`。

公開アーティファクトは1つだけです。ビルド元はmainとdevelopで区別しており、develop用のVite baseは `/cycling-map/develop/` を指定します。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm exec vite build --base=/cycling-map/develop/
```

### トラブルシュート

- ページは開くが画像・JSが404: Viteの `base` が公開パスと一致するか確認。
- `develop/` だけ古い: developの `Validate develop` が成功し、関連するDeploy to GitHub Pagesが成功したか確認。
- 地図が表示されない: インターネット接続、LeafletのCDN読込、OpenStreetMapタイルへの接続を確認。
