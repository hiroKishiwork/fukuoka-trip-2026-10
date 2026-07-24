import { list } from '@vercel/blob';

// 自由投稿ギャラリーの一覧を新しい順で返す（[{url, pathname, uploadedAt, ts, name}]）。
// 表示の正は list()（追加・削除が即時に反映される）。名前はパス名の16進から復元。
function hexDecode(hex) {
  if (!hex) return '';
  try { return Buffer.from(hex, 'hex').toString('utf8'); } catch (e) { return ''; }
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(200).json([]);
  try {
    const { blobs } = await list({ prefix: 'gallery/' });
    const items = [];
    for (const b of blobs) {
      if (b.pathname === 'gallery/manifest.json') continue;
      // gallery/{ts}-{rand}__{hexName}.jpg
      const base = b.pathname.replace(/^gallery\//, '').replace(/\.[^.]+$/, '');
      const parts = base.split('__');
      const left = parts[0] || '';
      const hexName = parts[1] || '';
      const ts = parseInt(left.split('-')[0], 10) || Date.parse(b.uploadedAt) || 0;
      items.push({
        url: b.url,
        pathname: b.pathname,
        uploadedAt: b.uploadedAt,
        ts: ts,
        name: hexDecode(hexName)
      });
    }
    items.sort(function (a, b) { return b.ts - a.ts; }); // 新しい順
    return res.status(200).json(items);
  } catch (e) {
    return res.status(200).json([]);
  }
}
