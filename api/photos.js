import { list } from '@vercel/blob';

// 現在アップロード済みの写真マニフェストを返す（{ theme: { url, updatedAt } }）
// 未接続・未アップロード時は空オブジェクトを返し、クライアントはフリー素材を表示する。
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({});
  }
  try {
    const { blobs } = await list({ prefix: 'photos/manifest.json' });
    if (!blobs.length) return res.status(200).json({});
    const r = await fetch(blobs[0].url + '?_=' + Date.now());
    if (!r.ok) return res.status(200).json({});
    const manifest = await r.json();
    return res.status(200).json(manifest || {});
  } catch (e) {
    return res.status(200).json({});
  }
}
