export default async function handler(req, res) {
    // CORS — allow the Epoch-hosted frontend to call this
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { ids, vs_currencies = 'usd', include_24hr_change } = req.query;
    if (!ids) return res.status(400).json({ error: 'ids required' });

    try {
        const params = new URLSearchParams({ ids, vs_currencies });
        if (include_24hr_change) params.set('include_24hr_change', include_24hr_change);

        const r = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?${params}`
        );
        const data = await r.json();
        res.setHeader('Cache-Control', 's-maxage=30');
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
