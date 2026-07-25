# 福岡旅行 詳細行程ページ（fukuoka-trip-2026-10）

2026年10月20日〜22日の福岡旅行（宗像大社・太宰府ほか）の行程しおりページ。
女子旅パステルデザインの1枚もの＋Vercel Functions＋Vercel Blobによる写真共有機能つき。

- 公開URL: https://fukuoka-trip-2026-10.vercel.app
- GitHub: https://github.com/hiroKishiwork/fukuoka-trip-2026-10
- 現在バージョン: **v1.6**（フッター右下に表示）

---

## 1. 技術スタック

| 項目 | 内容 |
|---|---|
| フロント | 素のHTML/CSS/JS 1枚（`index.html`）。ビルドなし。 |
| フォント | Google Fonts（見出し=M PLUS Rounded 1c、本文=Noto Sans JP） |
| 地図 | Leaflet 1.9.4 + OpenStreetMapタイル（cdnjs経由・APIキー不要・SRI付き） |
| サーバー | Vercel Functions（`api/*.js`、ESM、Node ランタイム） |
| ストレージ | Vercel Blob（`@vercel/blob` v2.6.1） |
| ホスティング | Vercel（GitHub連携で `master` push により自動デプロイ） |

外部依存はGoogle Fonts・cdnjs（Leaflet）・OpenStreetMap・Unsplash（初期フリー素材）・Vercel Blobのみ。オフライン時は行程テキストは表示され、画像・地図のみ欠ける。

---

## 2. ファイル構成

```
fukuoka-trip-2026-10/
├── index.html              # ページ本体（HTML/CSS/JSすべて内包）
├── api/
│   ├── upload-photo.js     # 各セクション固定写真の差し替え/戻す（POST）
│   ├── photos.js           # 固定写真の現在URL一覧（GET）
│   ├── gallery-upload.js   # みんなの写真：追加・削除（POST）
│   └── gallery-list.js     # みんなの写真：一覧（GET）
├── images/
│   ├── cover-hakata.jpg    # カバー既定画像（博多港夜景）※「元に戻す」の戻り先
│   └── hakatast.jpg        # 博多駅1F構内図（集合場所の参考・固定資料）
├── package.json            # type:module / @vercel/blob 依存
├── package-lock.json
├── .gitignore              # node_modules / .env* / .vercel
└── README.md               # このファイル
```

`.env.local`（`BLOB_READ_WRITE_TOKEN` を含む）と `node_modules/`、`.vercel/` はコミットしない。

---

## 3. 機能一覧

### 3-1. 行程表示
- 3日分（10/20・21・22）をタイムライン風カードで表示（時刻バッジ＋アイコン付きドット＋縦の連結線）。
- 上部の表示切替タブ「全部 / Day1 / Day2 / Day3」で日別フィルタ（JSで各 `section.day` の表示/非表示を切替）。
- 各スポットに公式サイト等の外部リンク（`.ext-link` クラス、新規タブ）。
- 集合セクションに博多駅1F構内図（`images/hakatast.jpg`、タップで拡大）。

### 3-2. 全体マップ（Leaflet）
- 6地点（博多駅・城戸南蔵院・宗像大社辺津宮・神湊波止場・大島・太宰府天満宮）をピン表示。
- 各ピンのポップアップに「Googleマップで開く」個別リンク（`?api=1&query=地点名+緯度,経度`）。
- マップ枠右上に代表地点（宗像大社）を開くボタン、下に全行程を線で結ぶ経路リンク（`maps/dir/?api=1`）。
- **重要**: Googleマップは座標のみだとピンが立たないことがあるため、**地点名を併記**して確実にラベル付きピンを出す。

### 3-3. 各セクションの写真差し替え（固定テーマ）
- ヒーローと各カードの写真に「📷 写真を変更 / 元に戻す」ボタン。
- テーマIDごとに `photos/{theme}.jpg` を**固定パスで上書き保存**（全訪問者に共有反映）。
- 「元に戻す」はBlobを削除し、`data-default`（Unsplash等の初期素材、カバーのみ `images/cover-hakata.jpg`）に戻す。

### 3-4. みんなの写真ギャラリー（自由投稿）
- ページ下部の「📸 みんなの写真」セクション。ヒーロー横のカードからジャンプ。
- 「写真を追加」で**複数選択**（一度に10枚まで）。新しい順にグリッド表示、タップでライトボックス拡大。
- 投稿者名（任意）を写真の下にキャプション表示。各写真に削除ボタン（認証なし・身内利用）。
- **一意パスで追加保存**（上書きしない）。

### 3-5. ヒーローのランダム表示（v1.5）
- ページ読み込みごとに、先頭画像を「カバー（博多港夜景）＋みんなの写真」からランダムに1枚表示。
- みんなの写真が0枚ならカバー固定。キャプションも連動（夜景=「博多ベイサイド 🌃」／投稿=「📸 みんなの写真より（名前）」）。

### 3-6. iPhone写真対応（v1.6）
- ギャラリー投稿時、**アップ前にブラウザ側でリサイズ＆JPEG変換**（`createImageBitmap` + canvas）。
- 大きい写真は 2000→1500→1100px と段階縮小して4.5MB以下に自動調整。EXIF回転も補正（`imageOrientation:'from-image'`）。
- HEIC（iPhone Safariはデコード可）もJPEG化してアップ。ファイル選択は `accept="image/*"`。

---

## 4. API 仕様

すべて同一オリジン。`BLOB_READ_WRITE_TOKEN` 未設定時は 503（アップロード系）または空配列/空オブジェクト（一覧系）を返し、フロントは初期素材にフォールバックする。

### 4-1. `POST /api/upload-photo`（固定テーマ写真）
- クエリ: `theme`（下記の許可テーマのみ）、`ct`（`image/*`）、`revert=1`（戻す時）
- ボディ: 画像バイナリ（`content-type: application/octet-stream`、最大約4.5MB）
- 保存先: `photos/{theme}.jpg`（`addRandomSuffix:false, allowOverwrite:true, cacheControlMaxAge:60`）
- あわせて `photos/manifest.json` を更新
- `revert=1`: `photos/{theme}.*` を `del()` して manifest から除去
- 許可テーマ: `cover, nanzoin, taimeshi, munakata, oshima, mizutaki, kagura, dazaifu, umegaemochi`

### 4-2. `GET /api/photos`（固定テーマ一覧）
- `list('photos/')` から生成し `{ theme: { url, updatedAt } }` を返す。
- **manifest.jsonは読まない**（後述の伝播遅延回避のため list() を正とする）。

### 4-3. `POST /api/gallery-upload`（みんなの写真）
- 追加: クエリ `ct`（`image/*`）、`name`（任意・最大40字）／ボディ=画像バイナリ
  - 保存先: `gallery/{timestamp}-{ランダム}__{投稿者名の16進}.jpg`（`addRandomSuffix:false, allowOverwrite:false, cacheControlMaxAge:31536000`）
  - `gallery/manifest.json`（配列）も更新
- 削除: クエリ `del=1&url={対象の公開URL}`
  - **`/gallery/` 配下のURLのみ受理**（固定セクション写真は誤削除不可）

### 4-4. `GET /api/gallery-list`（みんなの写真一覧）
- `list('gallery/')` から生成、新しい順に `[{ url, pathname, uploadedAt, ts, name }]` を返す。
- 投稿者名はパス名の16進から復元（`manifest.json` に依存しない＝即時・確実）。

---

## 5. Blob ストレージ構成

- Blob Store名: `fukuoka-trip-photos`（id: `store_lF4yDze2zECPWRyL`、region iad1、public）
- 公開ホスト: `https://lf4ydze2zecpwryl.public.blob.vercel-storage.com/`

```
photos/
  manifest.json            # { theme: {url, updatedAt} }（記録用）
  cover.jpg, nanzoin.jpg …  # 固定テーマ写真（上書き保存）
gallery/
  manifest.json            # [{url, pathname, uploadedAt, name}]（記録用）
  {ts}-{rand}__{hexname}.jpg  # 自由投稿（一意・上書きしない）
```

### 設計上の重要判断：なぜ list() を正にするか
Vercel Blobは**同一パスの上書き伝播が遅い**（テストで最大~90秒古い内容を返す事象を確認）。そのため `manifest.json` を都度読む方式だと「元に戻す」等が即時反映されない。
→ 一覧生成（`/api/photos`・`/api/gallery-list`）は **`list()` から生成**し、追加/削除が数秒で全員に反映されるようにした。`manifest.json` は仕様上の記録として書き込むが、表示の正はあくまで `list()`。
→ ギャラリーの投稿者名は上書き遅延の影響を受けないよう**パス名に16進で埋め込み**、list()だけで復元する。

---

## 6. デザインシステム（女子旅パステル）

CSS変数（`:root`／`prefers-color-scheme: dark` でダーク対応）:

| 変数 | ライト | 用途 |
|---|---|---|
| `--pink` / `--pink-strong` | #e79db0 / #d67e94 | 主役ピンク、見出し・リンク |
| `--pink-soft` | #fce7ec | 淡ピンク背景・枠 |
| `--mint` / `--mint-strong` | #9fd4c8 / #6fbdad | アクセント（Googleボタン等） |
| `--card` / `--bg` | #fff / #fdf5f3 | カード・背景 |
| `--ink` / `--muted` | #5c4a52 / #b198a2 | 本文・補足 |

- カードは角丸14〜20px＋薄い影（`--shadow-sm`）。ワンポイント: ♡ / ✿ / 🎀 を控えめに。
- 表・地図は横スクロール/枠角丸を維持。モバイルファースト、560px以上で一部レイアウト調整。
- トースト（`#toast`）とライトボックス（`#lightbox`）は共通利用。

---

## 7. デプロイ / 運用

### 通常の更新
```bash
git add . && git commit -m "..."
git push origin master        # GitHub連携で自動デプロイ
# もしくは手動: npx vercel@latest --prod --yes
```
※ vercel CLIはグローバル未インストール。`npx vercel@latest` で実行（認証済み: hirokishiwork）。

### 環境変数
- `BLOB_READ_WRITE_TOKEN`：Blob Store作成時に Production/Preview/Development へ自動注入済み。
- 再作成が必要な場合: `npx vercel@latest blob create-store <名前> --access public --yes`

### 既知の制約
- アップロード上限 **4.5MB**（Vercel Functionsのボディ上限）。ギャラリーは自動縮小で実質回避。
- HEIC変換はブラウザ依存（iPhone Safari＝可、Android/一部PC＝不可でスキップ）。
- Blob上書きの伝播遅延（前述）。新規追加・削除は list() 由来で即時。
- ギャラリー削除は認証なし（身内利用前提）。`/gallery/` 配下のみ削除可。

---

## 8. よくある編集の手順

### スポットに外部リンクを付ける
該当の見出し/リスト内テキストを次で囲む:
```html
<a class="ext-link" href="URL" target="_blank" rel="noopener">表示名</a>
```

### セクション写真の差し替え候補テーマを増やす
1. `api/upload-photo.js` の `ALLOWED` と `api/photos.js` の `THEMES` に新IDを追加。
2. `index.html` に写真枠を追加（`data-theme="新ID"` と `data-default` を設定、`.photo-actions` のボタンをコピー）。
3. デプロイ後、そのテーマにアップロード可能に。（例: `kagura` 追加時の実装を参照）

### カバーの既定画像（「元に戻す」の戻り先）を変える
`images/` に画像を置き、ヒーロー `img[data-theme="cover"]` の `src`/`data-default` をそのパスに変更。

### バージョン表記
フッターの `<span class="ver">vX.Y</span>` を更新。

---

## 9. バージョン履歴（要約）

| 版 | 内容 |
|---|---|
| v1.0 | 行程ページ初版（Markdown→HTML） |
| — | 女子旅パステルへ全面リデザイン＋各セクションにフリー素材の雰囲気画像 |
| v1.2 | 表示切替タブ、Blobによる固定写真共有、Googleマップボタン、全体マップ、バージョン表示 |
| v1.3 | Googleマップのピン不表示を修正（地点名併記／代表地点／経路リンク） |
| — | 各スポットのリンク追加、店名の見出し集約、絵文字調整、各写真の実写差し替え、博多駅構内図追加 |
| v1.4 | 「みんなの写真」自由投稿ギャラリー新設（gallery-upload / gallery-list） |
| v1.5 | ヒーロー画像を「カバー＋みんなの写真」からランダム表示。カバー既定を博多港夜景に |
| v1.6 | ギャラリー投稿の自動リサイズ＆JPEG変換（iPhone HEIC・大きい写真対応） |

（詳細は `git log` を参照）
