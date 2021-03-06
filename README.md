# BulkDigging
This program is a script mod for Minecraft PE.

## 概要
* Minecraft PEのModファイル
* 土や石をまとめて掘る
* 幾つかのモードがある

## ダウンロード
* ダウンロード先 : https://github.com/konamugi/BulkDigging/tree/master/script
* ファイル : BulkDigging.js

## 使い方
* Slotの右2つにシャベルもしくはツルハシを入れ、そのシャベルもしくはツルハシを使って掘る。
* 基本的には同じ種別のブロックをまとめて掘る。
 * 花崗岩も石も掘ることが可能。
 * flatモードの時はSlot右2のアイテム次第で土系石系まとめて掘るのが可能。
* 未実装的な内容
 * 掘っても経験値は落ちてこない
   * アイテムは落ちてくる
 * アイテムの使用回数が減らない

### コマンドについて
機能の有効無効やモード等の切り替えはメッセージに入力して行う。
/mod.digで始まる文字列で制御。

| コマンド | 内容 | 初期状態 |
| ---- | ---- | ---- |
| /mod.dig | 機能の有効無効を切り替える |on |
| /mod.dig mode &lt;mode> | モードの切り替え。初期状態ではgroup。<br>group:同種別のブロックを削除<br>flat:壊したブロックよりも下のブロックは壊さない。隣接する別種別のブロックであっても壊せると判断すれば壊す | group |
| /mod.dig set range &lt;number> | 壊す最大範囲を指定。壊したブロックから上下前後左右に適用する。flatの場合、下方向は無効。*5以上を指定すると重くなります。* 最大値は3を強く推奨。 | 2 |
|/mod.dig set safeMode &lt;0 or 1> | groupモード時にBlockを安全に掘削するかの指定。0:false, 1:true | 1 |
### safeModeについて
safeModeが有効の場合、以下のBlockは一括で掘削しない。
* Block.stone
* Block.grass
* Block.dirt
* Block.coarse_dirt
* Block.podzol
* Block.sand
* Block.red_sand


# ライセンス
GPL v3で配布。
簡単に書くと以下。
* 単に使う分にはなんの制限もないですよ
* このModを使用することで生じた損害は補償しませんよ
 * 個人の責任において使ってください

配布する場合はGPLをよく読んでください。
