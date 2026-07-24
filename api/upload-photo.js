import { put, del, list } from '@vercel/blob';

// テーマID（index.html の img[data-theme] と一致させる）
const ALLOWED = ['cover', 'nanzoin', 'taimeshi', 'munakata', 'oshima', 'mizutaki', 'dazaifu', 'umegaemochi'];
const MAX = 4.5 * 1024 * 1024; // Vercel Functions のリクエストボディ上限に合わせる（約4.5MB）

async function readRawBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX) {
      const e = new Error('too_large');
      e.code = 'TOO_LARGE';
      throw e;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readManifest() {
  try {
    const { blobs } = await list({ prefix: 'photos/manifest.json' });
    if (blobs.length) {
      const r = await fetch(blobs[0].url + '?_=' + Date.now());
      if (r.ok) return await r.json();
    }
  } catch (e) { /* ignore */ }
  return {};
}

async function writeManifest(manifest) {
  await put('photos/manifest.json', JSON.stringify(manifest), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0
  });
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({
      error: 'blob_not_configured',
      message: 'Blob Store未接続です。Vercelダッシュボードで接続してください。'
    });
  }

  const theme = (req.query.theme || '').toString();
  if (ALLOWED.indexOf(theme) < 0) {
    return res.status(400).json({ error: 'invalid_theme' });
  }
  const revert = req.query.revert === '1';

  try {
    const manifest = await readManifest();

    // --- 元のフリー素材に戻す（全員に反映：Blobを削除） ---
    if (revert) {
      try {
        const entry = manifest[theme];
        if (entry && entry.url) {
          await del(entry.url);
        } else {
          const { blobs } = await list({ prefix: 'photos/' + theme + '.' });
          for (const b of blobs) { await del(b.url); }
        }
      } catch (e) { /* 既に無い場合など無視 */ }
      delete manifest[theme];
      await writeManifest(manifest);
      return res.status(200).json({ ok: true, theme: theme, reverted: true });
    }

    // --- アップロード ---
    const ct = (req.query.ct || '').toString();
    if (!ct || ct.indexOf('image/') !== 0) {
      return res.status(400).json({ error: 'invalid_type', message: '画像ファイルのみ対応しています' });
    }

    let buf;
    if (Buffer.isBuffer(req.body)) buf = req.body;
    else buf = await readRawBody(req);

    if (!buf || !buf.length) return res.status(400).json({ error: 'empty' });
    if (buf.length > MAX) return res.status(413).json({ error: 'too_large', message: '最大4.5MBまでです' });

    const result = await put('photos/' + theme + '.jpg', buf, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: ct,
      cacheControlMaxAge: 60
    });

    const updatedAt = new Date().toISOString();
    manifest[theme] = { url: result.url, updatedAt: updatedAt };
    await writeManifest(manifest);

    return res.status(200).json({ ok: true, theme: theme, url: result.url, updatedAt: updatedAt });
  } catch (e) {
    if (e && e.code === 'TOO_LARGE') {
      return res.status(413).json({ error: 'too_large', message: '最大4.5MBまでです' });
    }
    return res.status(500).json({ error: 'server_error', message: String((e && e.message) || e) });
  }
}
