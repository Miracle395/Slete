/* ==========================================================
   SLETE LANDING
========================================================== */

const SlетeLanding = {

    prices: {},

    init() {
        this.initCanvas();
        this.initPrices();
        this.initReveal();
        this.initCountUp();
        this.initPools();
        console.log('⚡ Slete Landing');
    },

    /* ======================================================
       CANVAS BACKGROUND — drifting warm particles
    ====================================================== */

    initCanvas() {
        const canvas = document.getElementById('bgCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const particles = Array.from({length: 38}, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            r: Math.random() * 2.4 + 0.6,
            vx: (Math.random() - 0.5) * 0.22,
            vy: (Math.random() - 0.5) * 0.22,
            o: Math.random() * 0.35 + 0.08,
        }));

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(173,119,66,${p.o})`;
                ctx.fill();
            });
            requestAnimationFrame(tick);
        };
        tick();
    },

    /* ======================================================
       LIVE PRICES — CoinGecko public API
    ====================================================== */

    async initPrices() {
        const fmt = (n, decimals) =>
            '$' + Number(n).toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });

        const fmtChange = (n) => {
            const sign = n >= 0 ? '+' : '';
            return sign + n.toFixed(2) + '%';
        };

        const setPrice = (id, price, change) => {
            const priceEl  = document.getElementById('tick' + id);
            const changeEl = document.getElementById('tick' + id + 'c');
            if (!priceEl) return;

            const decimals = price >= 100 ? 2 : price >= 1 ? 3 : 4;
            priceEl.textContent = fmt(price, decimals);

            if (changeEl) {
                changeEl.textContent = fmtChange(change);
                changeEl.className = 'ticker-change ' + (change >= 0 ? 'positive' : 'negative');
            }
        };

        const fetchPrices = async () => {
            try {
                const res = await fetch(
                    'https://api.coingecko.com/api/v3/simple/price' +
                    '?ids=bitcoin,ethereum,solana,sui&vs_currencies=usd' +
                    '&include_24hr_change=true'
                );
                const d = await res.json();
                if (d.bitcoin)  setPrice('BTC', d.bitcoin.usd,  d.bitcoin.usd_24h_change);
                if (d.ethereum) setPrice('ETH', d.ethereum.usd, d.ethereum.usd_24h_change);
                if (d.solana)   setPrice('SOL', d.solana.usd,   d.solana.usd_24h_change);
                if (d.sui)      setPrice('SUI', d.sui.usd,      d.sui.usd_24h_change);
                this.prices = d;
            } catch(e) {
                console.warn('[Slete] Price fetch failed', e);
            }
        };

        fetchPrices();
        setInterval(fetchPrices, 30_000);
    },

    /* ======================================================
       REVEAL ON SCROLL
    ====================================================== */

    initReveal() {
        const els = document.querySelectorAll('.reveal');
        const obs = new IntersectionObserver(entries => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    setTimeout(() => e.target.classList.add('visible'), i * 80);
                    obs.unobserve(e.target);
                }
            });
        }, {threshold: 0.12});
        els.forEach(el => obs.observe(el));
    },

    /* ======================================================
       COUNT UP STATS
    ====================================================== */

    initCountUp() {
        const els = document.querySelectorAll('[data-target]');
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                const el     = e.target;
                const target = parseInt(el.dataset.target);
                const dur    = 1200;
                const start  = performance.now();
                const step   = (now) => {
                    const t = Math.min((now - start) / dur, 1);
                    const ease = 1 - Math.pow(1 - t, 3);
                    el.textContent = Math.floor(ease * target).toLocaleString();
                    if (t < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
                obs.unobserve(el);
            });
        }, {threshold: 0.5});
        els.forEach(el => obs.observe(el));
    },

    /* ======================================================
       LIVE POOLS — from DeepBook Predict server
    ====================================================== */

    async initPools() {
        const list = document.getElementById('poolsList');
        if (!list) return;

        const PREDICT_SERVER = 'https://predict-server.testnet.mystenlabs.com';
        const PREDICT_ID     = '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';

        const fmtCountdown = secs => {
            if (secs <= 0) return 'Ended';
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            if (h > 0) return h + 'h ' + String(m).padStart(2,'0') + 'm';
            return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
        };

        try {
            const res = await fetch(
                PREDICT_SERVER + '/predicts/' + PREDICT_ID + '/oracles'
            );
            if (!res.ok) throw new Error('fetch failed');
            const data    = await res.json();
            const oracles = Array.isArray(data) ? data : (data.oracles || data.data || []);

            if (!oracles.length) {
                list.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;font-size:14px;">No active pools found.</p>';
                return;
            }

            list.innerHTML = '';

            oracles.slice(0, 6).forEach((o, idx) => {
                const asset    = o.underlying_asset ? o.underlying_asset + ' / USDC' : 'BTC / USDC';
                const expiryMs = Number(o.expiry) > 1e12 ? Number(o.expiry) : Number(o.expiry) * 1000;
                const secsLeft = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
                const poolNum  = String(idx + 1).padStart(2, '0');

                const card = document.createElement('div');
                card.className = 'pool-card-land reveal';
                card.style.transitionDelay = (idx * 60) + 'ms';
                card.innerHTML = `
                    <div class="pool-land-asset">${asset}</div>
                    <div class="pool-land-field">
                        <span>Pool</span>
                        <strong>#${poolNum}</strong>
                    </div>
                    <div class="pool-land-field">
                        <span>Closes in</span>
                        <strong class="pool-land-timer" data-expiry="${expiryMs}">${fmtCountdown(secsLeft)}</strong>
                    </div>
                    <div class="pool-land-field">
                        <span>Entry fee</span>
                        <strong>1 DUSDC</strong>
                    </div>
                    <div class="pool-land-field">
                        <span>Status</span>
                        <strong style="color:var(--green)">Open</strong>
                    </div>
                    <a href="index.html" class="pool-land-predict">Predict</a>
                `;
                list.appendChild(card);
            });

            // re-run reveal on newly added cards
            this.initReveal();

            // live timers
            setInterval(() => {
                document.querySelectorAll('.pool-land-timer').forEach(el => {
                    const expiry = Number(el.dataset.expiry);
                    const secs   = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
                    el.textContent = fmtCountdown(secs);
                });
            }, 1000);

        } catch(e) {
            console.warn('[Slete] Pool fetch failed', e);
            list.innerHTML = '';
            ['BTC / USDC', 'ETH / USDC', 'SUI / USDC'].forEach((asset, idx) => {
                const card = document.createElement('div');
                card.className = 'pool-card-land reveal';
                card.style.transitionDelay = (idx * 60) + 'ms';
                card.innerHTML = `
                    <div class="pool-land-asset">${asset}</div>
                    <div class="pool-land-field"><span>Status</span><strong style="color:var(--green)">Open</strong></div>
                    <div class="pool-land-field"><span>Entry</span><strong>1 DUSDC</strong></div>
                    <div class="pool-land-field"><span>Network</span><strong>Sui Testnet</strong></div>
                    <div class="pool-land-field"></div>
                    <a href="index.html" class="pool-land-predict">Predict </a>
                `;
                list.appendChild(card);
            });
            this.initReveal();
        }
    },

};

document.addEventListener('DOMContentLoaded', () => SlетeLanding.init());