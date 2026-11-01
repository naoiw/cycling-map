# CYCLING MAP

サイクリングコンピュータなどから出力した GPX / TCX 形式の走行ログを、地図上に重ねて確認するブラウザツールです。旧 [JourneyMap](https://github.com/naoiw/JourneyMap) を参考に React + TypeScript で作り直しました。

## 公開URL

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/cycling-map/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/cycling-map/develop/ |

## 主な機能

- GPX・TCXファイルの複数選択、ドラッグ＆ドロップ、サンプル表示
- OpenStreetMap上に複数経路を色分けして重ね描き
- 経路ごとの表示切り替え、個別の経路にズーム、全経路にフィット
- 各走行の日時・経過時間・走行距離・ポイント数・累積標高上昇量（記録がある場合）
- 全件と表示中それぞれの走行距離集計、日時順の記録一覧
- スマートフォンを含むレスポンシブUI

サンプルは架空のログです。個人の走行ログはリポジトリに含めていません。

## 操作方法

1. 「ファイルを選択」またはドラッグ＆ドロップで `.gpx` / `.tcx` を読み込みます。サンプルを使って動作確認することもできます。
2. 記録名を押すと経路にズームします。チェックを外すとその経路を非表示にできます。
3. 「全経路に合わせる」で表示中の経路全体へズームします。記録を表示・非表示にしても、手動の地図位置・縮尺は維持されます。
4. 記録を個別に削除、またはまとめて消去できます。

**プライバシー:** ファイル解析はブラウザ内で完結し、サーバーへアップロードしません。ログは保存されず、ページ再読み込みで消去されます。地図タイル（OpenStreetMap）と地図ライブラリ（Leaflet）の取得には外部への通信が発生します。

**注意:** 距離はGPS座標から計算した概算です。機器側の距離・標高表示と一致しない場合があります。

## 技術スタックとローカル開発

- React 18 / TypeScript 5.6 / Vite 6
- Leaflet 1.9.4（CDN）、OpenStreetMap標準タイル
- Node.js 20 / pnpm 9.14.2

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev     # ローカルで起動
pnpm test    # 地理計算の自動テスト
pnpm build   # 型チェックと本番ビルド
```

## ブランチ・デプロイ運用

- 通常の作業は `develop` に反映し、CI成功後に `/develop/` へ公開。
- `develop` → `main` のPRをマージすると本番へ反映します。
- GitHub Pages の Source は **GitHub Actions**。本番とプレビューを単一のPagesデプロイにまとめます。

## コード構成

- `src/App.tsx` — ファイルの読み込みと走行記録の状態管理
- `src/MapView.tsx` — Leafletの地図表示、表示範囲の制御
- `src/lib/parser.ts` — GPX / TCXのXML解析
- `src/lib/geo.ts` — 緯度経度からの距離計算
- `src/lib/rideColors.ts` — 経路と一覧マーカーに共通の色
- `public/samples/` — 模擬GPX / TCXサンプル
- `tests/` — Node.jsによる地理計算のテスト
- `.github/workflows/` — CI・GitHub Pagesデプロイ
- `docs/` — 仕様と開発資料

詳細：[仕様](docs/SPEC.md) / [開発](docs/DEVELOPMENT.md) / [デプロイ](docs/DEPLOYMENT.md)

## ライセンス

[MIT License](LICENSE)。地図データ © OpenStreetMap contributors。Leafletのライセンスはライブラリの配布元に従います。
