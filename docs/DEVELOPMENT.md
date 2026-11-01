# 開発

## 動作環境

- Node.js 20 / pnpm 9.14.2（`.nvmrc`、`packageManager` に固定）
- React 18 / TypeScript 5.6 / Vite 6
- Leaflet 1.9.4（外部CDNで読み込み）、OpenStreetMap標準タイル

## ローカル操作

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

`pnpm test` は TypeScriptの `geo.ts` をES Modulesとして `tests/dist/` に一時コンパイルし、Node.js組み込みテストで距離・区間境界・座標検証を行います。生成物はGit管理外です。古いCommonJSのセットアップは使用しません。

`pnpm build` はTypeScriptのチェックとViteの本番ビルドを行います。

## コード概要

- `src/App.tsx`: ログの取込、状態管理、画面表示。非同期ファイル読み込みはrefで排他制御。
- `src/MapView.tsx`: Leafletの初期化・破棄、経路とビュー範囲の独立管理。大型ログの座標配列展開を回避。
- `src/lib/parser.ts`: ブラウザのDOMParserを使ったGPX/TCX解析。XML名前空間はlocalNameで判定。
- `src/lib/geo.ts`: 地理計算の純粋関数。
- `src/lib/rideColors.ts`: 地図経路と一覧に共通の色定義。
- `public/samples/`: 位置情報を含む実利用者データではなく、架空の例。
- `src/index.css`: 他のnaoiwサイトと整合したサイト共通トークンとアプリ固有スタイル。

DOMParserとLeafletを使うUIの動作は、ローカルブラウザまたは公開プレビューでサンプルを読み込んで確認してください。NodeテストはXMLパーサーの網羅的検証を意味しません。

## ブランチ運用

1. 通常の修正は`develop`。
2. `develop` push/PRは `Validate develop` CI（テスト・ビルド）で確認。
3. developの検証成功で `/cycling-map/develop/` にデプロイ。
4. `develop` → `main` PRマージで `/cycling-map/` へ本番反映。

## 個人データの取り扱い

個人のGPX・TCXログやAPIキーはGitへ含めない。旧JourneyMap内の個人データ・Google Mapsキーは移植しない。
