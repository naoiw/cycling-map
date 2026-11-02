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
- `src/lib/rideColors.ts`: 既定色・固定5段階自動色分け・手動モードの色指定を排他的に切り替える純粋関数。地図経路と一覧に共用。
- `src/lib/exportGeometry.ts`: エクスポート対象、Web Mercator投影、表示範囲、統計表示文字列、ファイル名の純粋関数。
- `src/lib/exportPng.ts`: Canvas上でOSMタイル・ポリライン・統計を合成しPNG Blobを返す。#11と共用できるようUIから独立。
- `public/samples/`: 公開サンプル用の4つの `yymmdd.gpx` と配置手順。
- `scripts/generate-sample-index.mjs`: dev/build前にサンプルを走査して `public/samples/index.json` を生成。
- `tests/samples.test.mjs`: 日付ファイル名のフィルタリング、最大件数のテスト。
- `tests/rideColors.test.mjs`: 距離・獲得標高の境界値、欠損値、手動色優先のテスト。
- `tests/exportGeometry.test.mjs`: PNG対象の可視判定、全経路フィット、集計、ファイル名のテスト。
- `src/index.css`: 他のnaoiwサイトと整合したサイト共通トークンとアプリ固有スタイル。

開発サーバー起動後にサンプルを増減した場合は、`pnpm dev` を再起動してください。`pnpm exec vite build` 単独ではインデックスの自動生成が実行されないので、原則 `pnpm build` を使用してください。develop用のPagesワークフローは明示的に生成スクリプトを実行します。

DOMParserとLeafletを使うUIの動作は、ローカルブラウザまたは公開プレビューでサンプルを読み込んで確認してください。NodeテストはXMLパーサーの網羅的検証を意味しません。色分け機能はサンプル4件を読み込み、初期状態で「手動」が選択されていること、距離別・獲得標高別で手動色プルダウンが無効になること、凡例と区分色の一致、手動へ戻した際の以前の色設定、非表示／再表示による色の維持をプレビュー画面で確認してください。

## PNG保存の確認

1. `pnpm test && pnpm build` を実行する。
2. developプレビューで4件のサンプルを読み込み、距離・獲得標高・手動色を切替え、両PNGボタンで1600×900の画像が保存されるか確認する。
3. 1件を非表示にしてから保存し、地図と統計に含まれないことを確認する。
4. 標高情報のないTCX/GPXでも統計に欠損表示がされるか確認する。
5. ネットワーク切断／CORS失敗時にエラーメッセージを表示し、不完全なPNGが保存されないことを確認する。**タイルサーバーのCORS実動作はNodeテストの対象外なのでブラウザで要確認。**
6. OpenStreetMapタイルの利用ポリシー（https://operations.osmfoundation.org/policies/tiles/）に従い、リクエストはクリック時に表示対象の必要分だけ行う。連続した過度な保存は避ける。

## ブランチ運用

1. 通常の修正は`develop`。
2. `develop` push/PRは `Validate develop` CI（テスト・ビルド）で確認。
3. developの検証成功で `/cycling-map/develop/` にデプロイ。
4. `develop` → `main` PRマージで `/cycling-map/` へ本番反映。

## 個人データの取り扱い

公開を意図しない個人のGPX・TCXログやAPIキーはGitへ含めない。**公開サンプルGPXは第三者がダウンロードでき、位置・時刻情報を復元できる**ため、事前に内容を確認する。旧JourneyMap内の個人データ・Google Mapsキーは移植しない。
