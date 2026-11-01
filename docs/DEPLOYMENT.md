# GitHub Pages

## URL

- 本番: https://naoiw.github.io/cycling-map/ （main）
- プレビュー: https://naoiw.github.io/cycling-map/develop/ （develop）

## 設定

リポジトリの Settings → Pages → Build and deployment → Source を **GitHub Actions** にする。
独立したPages環境を2つ作らず、両方のビルド出力を1 artifact にまとめます。

## ワークフロー

- `.github/workflows/validate-develop.yml` — `develop`へのpushとPRを検証。
- `.github/workflows/deploy-pages.yml` — `main` push、またはdevelopの検証成功で実行。mainを本番に、検証したdevelopコミットを開発プレビューにビルドし、1回でデプロイ。
- `develop` へpushしても検証失敗時は公開しない。mainへのpushは両環境を再ビルド。

## ローカルのビルド確認

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm exec vite build --base=/cycling-map/develop/
```

本番・開発URLはいずれもViteのbaseを正しく設定する必要があります。
