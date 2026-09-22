const { queryNearby } = require('../lib/nearby.cjs');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const params = new URL(req.url, 'https://yakinim.vercel.app').searchParams;
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const radius = Number(params.get('radius'));
  if (!params.get('lat')?.trim() || !params.get('lng')?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || ![1000, 3000, 5000].includes(radius)) {
    return res.status(400).json({ error: 'invalid_location_or_radius' });
  }
  try {
    return res.status(200).json(await queryNearby({ lat, lng }, radius));
  } catch (error) {
    console.error('Nearby providers unavailable:', error.message);
    return res.status(503).json({ error: 'nearby_unavailable' });
  }
};
