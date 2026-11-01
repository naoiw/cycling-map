# 開発

## 技術

- React 18, TypeScript 5.6, Vite 6, Node.js 20, pnpm 9
- Leaflet 1.9.4はCDN読み込み。OpenStreetMapのタイルを利用（利用規約・クレジットを遵守）。

## コマンド

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

`pnpm test` は測地線距離の計算、区間の独立性、座標の妥当性をNode.jsで検証します。
XML解析にはブラウザ標準のDOMParserを使用するため、GPX/TCXの画面確認は同梱サンプルでも行います。

## 開発ルール

1. 開発は `develop` ブランチで行う。
2. `develop` push時に検証し、成功したコミットを `/develop/` へデプロイ。
3. `develop` → `main` のPRでレビューして本番反映。
4. `main` は `/`、`develop` は `/develop/`。Viteのbaseに注意。

## プライバシー

走行ログをGit管理に含めないこと。サンプルは模擬座標・模擬日時のみ。
旧JourneyMap内のGoogle Maps APIキーや個人のGPXを移植しないこと。
