# サイト共通UI

`cycling-map` のヘッダー・フッター・画面幅と基本コンポーネントは、`naoiw.github.io`、`photo-editor`、`react-gui-tool` などの制作物と揃える。

## 共通トークン

| トークン | 値 |
| --- | --- |
| `--chrome-font` | Inter, Noto Sans JP, Hiragino Kaku Gothic ProN, Meiryo, system-ui, sans-serif |
| `--chrome-width` | 1180px |
| `--chrome-gutter` | PC 28px / 620px以下 17px |
| `--chrome-header-height` | PC 78px / 620px以下 67px |
| `--chrome-brand-size` | 16px |
| `--chrome-caption-size` | 11px |
| `--chrome-footer-size` | 12px |

## レイアウトと配色

- `.site-shell > .page-container > (.site-header, .site-main, .site-footer)` 構成。
- `.page-container` に左右余白を与え、ヘッダー/フッター内部の横線はその内側で止める。画面端まで伸ばさない。
- ヘッダー左にサイト名と36×36pxアイコン、右に補助ラベルを置く。GitHubリンクはフッター右側だけにする。
- フッターは上28px、下32px、文字12px・weight 500。リンク表記は `GitHub ↗`。
- ベースは他のダーク系ツールに合わせた `#0b1220`、カードは `#172337` ～ `#19283c`、線は `#304157`、アクセントは `#70ddc7`。
- 一次・二次ボタンは `.button`、`.button--primary`、`.button--secondary` を共有。見出し/説明文/集計カードの字体・余白も共通化。
- 地図は元のOpenStreetMapタイル色を保つ。経路の色は複数記録を区別するためのアプリ固有色。
- 820px以下では走行記録と地図を縦並びにし、620px以下ではカード表示数・余白・地図の高さを最適化。

## 確認

```sh
pnpm test
pnpm build
```

- 開発/本番でヘッダー・フッターが同じ左右位置で揃うこと。
- PCとスマートフォンでボタン・記録一覧・地図が重ならないこと。
- GPX/TCXの読み込み、サンプル表示、経路の表示切替とズームが利用可能であること。
