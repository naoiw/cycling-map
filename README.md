# CYCLING MAP

GPX / TCX 形式のサイクリング走行記録を読み込み、地図上に重ねて可視化する静的Webアプリです。以前の [JourneyMap](https://github.com/naoiw/JourneyMap) を参考に、React / TypeScript で再実装しました。

## 主な機能

- 複数のGPX・TCXファイルを選択またはドラッグ＆ドロップでインポート
- OpenStreetMap / Leaflet 上で全経路を重ね描き。各経路の表示・非表示、個別ズームに対応
- ファイルごとの走行日時、経過時間、走行距離、ポイント数、標高上昇量を表示（記録がある項目のみ）
- 総距離・表示中の距離を集計。新しい記録から一覧表示
- GPXのトラックセグメント・ルート、TCXのラップ/トラックに対応
- 体験用の架空サンプル GPX / TCX を同梱
- PC・スマートフォン対応

**プライバシー**: アップロードAPIや保存機能はありません。利用者のファイルはブラウザ内でのみ処理され、再読み込みで消えます。旧JourneyMapの私的なログは含めていません。地図タイルとライブラリの取得には外部サイトへ通信します。

## 公開先

| 環境 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | https://naoiw.github.io/cycling-map/ |
| 開発プレビュー | `develop` | https://naoiw.github.io/cycling-map/develop/ |

GitHub Actions で本番とプレビューを1つの Pages artifact にまとめて公開します。Pages の Source は **GitHub Actions** を使用してください。

## ローカル開発

Node.js 20 / pnpm 9.14.2 を使用します。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm dev
pnpm build
```

## 構成

- `src/lib/parser.ts` — XMLのGPX / TCX解析
- `src/lib/geo.ts` — 測地線距離の概算計算
- `src/MapView.tsx` — Leaflet地図と走行経路の描画
- `src/App.tsx` — ファイル取込と操作UI
- `public/samples/` — 架空のサンプルログ
- `docs/` — 仕様、開発手順、デプロイ
- `.github/workflows/` — CIとPages公開

## ドキュメント

- [仕様](docs/SPEC.md)
- [開発](docs/DEVELOPMENT.md)
- [公開](docs/DEPLOYMENT.md)

## ライセンス

[MIT](LICENSE)。地図データは © OpenStreetMap contributors、地図表示ライブラリは Leaflet です。
