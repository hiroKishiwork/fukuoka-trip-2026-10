import { list } from '@vercel/blob';

// テーマID（index.html の img[data-theme] と一致）
const THEMES = ['cover', 'nanzoin', 'taimeshi', 'munakata', 'oshima', 'mizutaki', 'kagura', 'dazaifu', 'umegaemochi'];

// 現在アップロード済みの写真を返す（{ theme: { url, updatedAt } }）。
// manifest.json の上書き伝播は遅いため、実体の list() から生成して即時性を確保する。
// 未接続・未アップロード時は空オブジェクトを返し、クライアントはフリー素材を表示する。
export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(200).json({});
  }
  try {
    const { blobs } = await list({ prefix: 'photos/' });
    const out = {};
    for (const b of blobs) {
      const name = b.pathname.replace(/^photos\//, '').replace(/\.[^.]+$/, '');
      if (THEMES.indexOf(name) >= 0) {
        out[name] = { url: b.url, updatedAt: b.uploadedAt };
      }
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(200).json({});
  }
}
