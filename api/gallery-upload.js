import { put, del, list } from '@vercel/blob';

// 自由投稿ギャラリー：一意パスで追加保存（上書きしない）。
// 投稿者名はパス名に16進エンコードで埋め込み、一覧生成を list() だけで即時・確実に行えるようにする。
// あわせて gallery/manifest.json（配列）も仕様どおり更新する（表示の正となるのは list()）。
const MAX = 4.5 * 1024 * 1024; // Vercel Functions のボディ上限に合わせる（約4.5MB）

function hexEncode(str) { return Buffer.from(String(str), 'utf8').toString('hex'); }

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX) { const e = new Error('too_large'); e.code = 'TOO_LARGE'; throw e; }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readManifest() {
  try {
    const { blobs } = await list({ prefix: 'gallery/manifest.json' });
    if (blobs.length) {
      const r = await fetch(blobs[0].url + '?_=' + Date.now());
      if (r.ok) { const j = await r.json(); if (Array.isArray(j)) return j; }
    }
  } catch (e) { /* ignore */ }
  return [];
}

async function writeManifest(arr) {
  await put('gallery/manifest.json', JSON.stringify(arr), {
    access: 'public', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 0
  });
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'blob_not_configured', message: 'Blob Store未接続です。' });
  }

  try {
    // ---- 削除（誤投稿の取り消し） ----
    if (req.query.del) {
      const url = (req.query.url || '').toString();
      // ギャラリー配下のみ削除可（固定セクション写真などは対象外）
      if (!url || url.indexOf('/gallery/') < 0) return res.status(400).json({ error: 'invalid_url' });
      try { await del(url); } catch (e) { /* 既に無い等 */ }
      try { const m = await readManifest(); await writeManifest(m.filter(function (x) { return x.url !== url; })); } catch (e) {}
      return res.status(200).json({ ok: true, deleted: true });
    }

    // ---- アップロード ----
    const ct = (req.query.ct || '').toString();
    if (!ct || ct.indexOf('image/') !== 0) return res.status(400).json({ error: 'invalid_type', message: '画像ファイルのみ対応' });
    const name = (req.query.name || '').toString().slice(0, 40).trim();

    let buf = Buffer.isBuffer(req.body) ? req.body : await readRawBody(req);
    if (!buf || !buf.length) return res.status(400).json({ error: 'empty' });
    if (buf.length > MAX) return res.status(413).json({ error: 'too_large', message: '最大4.5MBまでです' });

    const now = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    const hexName = name ? hexEncode(name) : '';
    // 例: gallery/1719999999999-ab12cd34__<hexname>.jpg （一意なので上書きされない）
    const pathname = 'gallery/' + now + '-' + rand + '__' + hexName + '.jpg';

    const result = await put(pathname, buf, {
      access: 'public', addRandomSuffix: false, allowOverwrite: false,
      contentType: ct, cacheControlMaxAge: 31536000
    });

    const entry = { url: result.url, pathname: result.pathname, uploadedAt: new Date(now).toISOString(), name: name };
    try { const m = await readManifest(); m.push(entry); await writeManifest(m); } catch (e) { /* 非必須 */ }

    return res.status(200).json({ ok: true, ...entry });
  } catch (e) {
    if (e && e.code === 'TOO_LARGE') return res.status(413).json({ error: 'too_large', message: '最大4.5MBまでです' });
    return res.status(500).json({ error: 'server_error', message: String((e && e.message) || e) });
  }
}
