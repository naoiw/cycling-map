<!-- naoiw:managed:start -->
# naoiw 共通AI開発規約（管理領域）

**特別な指示がない場合は naoiw/.github の開発規約を既定値として適用する。**
優先順位は (1)今回のユーザー指示 (2)このリポジトリ固有のREADME/docs/設定/既存実装 (3)naoiw/.githubの標準。すべて確認できない場合は推測せず未確認と報告する。

共通規約原本:
- https://github.com/naoiw/.github/blob/main/standards/AI_DEVELOPMENT.md
- https://github.com/naoiw/.github/blob/main/standards/GITHUB_FLOW.md
- https://github.com/naoiw/.github/blob/main/standards/TECH_STACK.md
- https://github.com/naoiw/.github/blob/main/standards/UI_STYLE.md
- https://github.com/naoiw/.github/blob/main/standards/REPOSITORY_STRUCTURE.md

## 守ること
1. 着手前に関連Issue・PR・ブランチ、README/docs、既存実装を調べ、重複作業を避ける。
2. mainは本番。原則短命ブランチ→PR→関連テスト/ビルド→ユーザーが認めたマージ。developは既に存在し用途が明示された場合だけ使用する。
3. 「Issueのみ」「実装しない」「mainにマージしない」「developだけ」などの範囲指定を優先する。
4. 依存・ライセンス・CSS・構成は個別プロジェクトの既存方針を勝手に変更しない。
5. アプリUIに開発状況・次のTODO・GitHubリンク等を依頼なく追加しない。
6. 未実施の検証を成功と報告しない。差分、PR、残課題、公開状態を明示する。
7. 参考ファイルや機密情報をPRへ混入させず、mainの差分を確認する。

これは同期される指示の抜粋。詳細は上記の原本を参照する。外部リンクを取得できないAIは、取得済みと主張せずこの抜粋と対象リポジトリの規約を優先する。
<!-- naoiw:managed:end -->

## リポジトリ固有の指示
- mainは本番、developは公開プレビュー。通常の変更はdevelop向けPRで検証し、確認後にmainへ反映する。
- Node.js 26 / pnpm 9.14.2を維持する。npmへ無断変更しない。
- `pnpm test` と `pnpm build` で検証する。Viteベースパス `/cycling-map/` と `/cycling-map/develop/` を維持する。
- 公開サンプルGPXの位置情報・プライバシーに注意する。
- MITライセンスを維持する。詳細は `docs/DEVELOPMENT.md`、`docs/DEPLOYMENT.md` を参照。
