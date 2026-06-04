/* ==========================================================
   SLETE CORE
   Application Runtime
========================================================== */

const Slete = {

    state: {
    walletConnected: false,
    activeTab: 'all',
    prices: {},
    markets: [],
    predictions: {},
    initialized: false
},
    
    TOKEN_ICONS: {
        'SUI':  'https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png',
        'ETH':  'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
        'SOL':  'https://assets.coingecko.com/coins/images/4128/small/solana.png',
        'USDC': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
        'BTC':  'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    },

    getIconHTML(asset) {
    const [base] = asset.split(' / ');
    const baseUrl = this.TOKEN_ICONS[base] || '';
    return `
        <div class="asset-icons">
            ${baseUrl ? `<img class="asset-icon" src="${baseUrl}" alt="${base}">` : ''}
        </div>`;
},

    /* ======================================================
       BOOT
    ====================================================== */

    init() {

        if (this.state.initialized) return;

        this.state.initialized = true;

        this.initNavigation();

        this.initFilters();

        this.initWallet();

        this.initCountdowns();
        
        this.initOracleData();

        this.initMetrics();

        this.initMarketPrices();

        this.initButtons();

        this.initTheme();
        
        this.initSidebar();
        
        this.initPropose();

        this.initObservers();
        
        this.renderCardIcons();

        console.log(
            '⚡ SLETE READY'
        );

    },

    /* ======================================================
       NAVIGATION
    ====================================================== */

    initNavigation() {

        const navItems =
            document.querySelectorAll(
                '[data-nav]'
            );
            
            // set pools as active on load
const poolsNav = document.querySelector('[data-nav="pools"]');
if (poolsNav) poolsNav.classList.add('active');

        navItems.forEach(item => {
    item.addEventListener('click', () => {

        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const target = item.dataset.nav;

        // show/hide pages
        const allPages = ['page-pools', 'page-portfolio', 'page-leaderboard', 'page-propose'];
allPages.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = 'none';
});
const pageMap = {
    'pools': 'page-pools',
    'portfolio': 'page-portfolio',
    'leaderboard': 'page-leaderboard',
};
const pageId = pageMap[target];
if (pageId) {
    const page = document.getElementById(pageId);
    if (page) page.style.display = '';
}

        if (target === 'portfolio') {
            this.renderPortfolio();
        }

    });
});

    },

    /* ======================================================
       FILTERS
    ====================================================== */

    initFilters() {

        const filters =
            document.querySelectorAll('.filter-chip');

        filters.forEach(filter => {

            filter.addEventListener('click', () => {

                filters.forEach(btn =>
                    btn.classList.remove('active')
                );

                filter.classList.add('active');

                const tab = filter.textContent.trim().toLowerCase();
                this.state.activeTab = tab;
                this.applyFilter(tab);

            });

        });

    },

    applyFilter(tab) {

        const cards = document.querySelectorAll('.pool-card');

        cards.forEach(card => {

            if (tab === 'all') {
                card.style.display = '';
                return;
            }

            const statusEl = card.querySelector('.pool-status');
            const status = statusEl
                ? statusEl.textContent.trim().toLowerCase()
                : '';

            card.style.display =
                status === tab ? '' : 'none';

        });

    },

    /* ======================================================
       WALLET
    ====================================================== */

    initWallet() {

    const btn = document.getElementById('walletBtn');
    if (!btn) return;

    const updateWalletUI = (connected, address = '') => {

        this.state.walletConnected = connected;

        if (connected) {
            const short = address
                ? address.slice(0, 6) + '...' + address.slice(-4)
                : 'Connected';
            btn.textContent = ' ' + short;
            btn.classList.add('connected');
        } else {
            btn.textContent = 'Connect';
            btn.classList.remove('connected');
        }

        this.updatePredictGate();
        
        window.dispatchEvent(new CustomEvent('slete:walletUpdate', {
    detail: { connected, address }
}));
        
        const portfolioPage = document.getElementById('page-portfolio');
if (portfolioPage && portfolioPage.style.display !== 'none') {
    this.renderPortfolio();
}
        
        // restore position if already predicted this pool
const openPoolId = document.getElementById('detailMetaPool')?.textContent?.trim();
const existingPred = openPoolId ? this.state.predictions[openPoolId] : null;
const posEl = document.getElementById('detailPosition');
const submitBtn = document.getElementById('detailSubmit');

if (existingPred && posEl && submitBtn) {
    this.showPosition(existingPred);
    submitBtn.textContent = 'Prediction Locked In  ';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';
} else if (posEl) {
    posEl.style.display = 'none';
    if (submitBtn) {
        submitBtn.textContent = 'Confirm Prediction  ';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.45';
        submitBtn.style.cursor = 'not-allowed';
    }
}

    };

    btn.addEventListener('click', () => {
        if (this.state.walletConnected) return;
        if (typeof window.handleConnect === 'function') {
            window.handleConnect(btn);
        }
    });

    // expose for sui-wallet.js to call
    window.onWalletConnected = (address) => updateWalletUI(true, address);
    window.onWalletDisconnected = () => updateWalletUI(false);

},

updatePredictGate() {

    const gate = document.getElementById('detailConnectGate');
    const form = document.getElementById('detailPredictForm');
    if (!gate || !form) return;

    if (this.state.walletConnected) {
        gate.style.display = 'none';
        form.style.display = 'block';
    } else {
        gate.style.display = 'block';
        form.style.display = 'none';
    }

},

showPosition(predictedPrice) {

    const posEl = document.getElementById('detailPosition');
    if (!posEl) return;

    const currentPriceText = document.getElementById('detailLivePrice')?.textContent || '';
    const currentPrice = parseFloat(currentPriceText.replace('$', '').replace(',', ''));

    const crowdText = document.getElementById('detailCrowdText')?.textContent || '';
    const crowdMatch = crowdText.match(/\$([\d.]+)/);
    const crowdPrice = crowdMatch ? parseFloat(crowdMatch[1]) : null;

    const decimals = currentPrice >= 100 ? 2 : 4;
    const distance = Math.abs(predictedPrice - currentPrice);
    const distPct = ((distance / currentPrice) * 100).toFixed(2);

    document.getElementById('posYours').textContent = '$' + predictedPrice.toFixed(decimals);
    document.getElementById('posCurrent').textContent = '$' + currentPrice.toFixed(decimals);
    document.getElementById('posCrowd').textContent = crowdPrice
        ? '$' + crowdPrice.toFixed(decimals)
        : '—';
    document.getElementById('posDistance').textContent = '$' + distance.toFixed(decimals) + ' (' + distPct + '%)';

    // highlight your prediction row
    const rows = posEl.querySelectorAll('.detail-position-row');
    if (rows[0]) rows[0].classList.add('highlight');

    posEl.style.display = 'block';

},

renderPortfolio() {

    const gate = document.getElementById('portfolioGate');
    const content = document.getElementById('portfolioContent');

    if (!this.state.walletConnected) {
        if (gate) gate.style.display = 'flex';
        if (content) content.style.display = 'none';
        return;
    }

    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';

    const predictions = this.state.predictions;
    const keys = Object.keys(predictions);

    // stats
    document.getElementById('portStatTotal').textContent = keys.length;
    document.getElementById('portStatWinRate').textContent = keys.length ? '—' : '—';
    document.getElementById('portStatEarned').textContent = '0 USDC';

    // empty vs history
    const emptyEl = document.getElementById('portfolioEmpty');
    const historyEl = document.getElementById('portfolioHistory');

    if (keys.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        if (historyEl) historyEl.style.display = 'none';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (historyEl) historyEl.style.display = 'block';

    // build rows
    const rowsEl = document.getElementById('portfolioHistoryRows');
    if (!rowsEl) return;
    rowsEl.innerHTML = '';

    // find pool pair from pool id
    const poolMap = {};
    document.querySelectorAll('.pool-card').forEach(card => {
        const idEl = card.querySelector('.pool-id');
        const assetEl = card.querySelector('.asset');
        if (idEl && assetEl) {
            const id = idEl.textContent.replace('#','').trim().split(' ')[0];
            poolMap[id] = assetEl.textContent.trim();
        }
    });

    keys.forEach(poolId => {
        const price = predictions[poolId];
        const pair = poolMap[poolId] || 'Pool #' + poolId;
        const decimals = price >= 100 ? 2 : 4;

        const row = document.createElement('div');
        row.className = 'portfolio-row';
        row.innerHTML = `
            <span class="portfolio-row-pair">${pair}</span>
            <span class="portfolio-row-price">$${price.toFixed(decimals)}</span>
            <span class="portfolio-row-status pending">Pending</span>
        `;
        rowsEl.appendChild(row);
    });

},

    /* ======================================================
       COUNTDOWNS
    ====================================================== */

    initCountdowns() {

        const timers =
            document.querySelectorAll(
                '[data-countdown]'
            );

        if (!timers.length) return;

        setInterval(() => {

            timers.forEach(timer => {

                let value =
                    Number(
                        timer.dataset.countdown
                    );

                if (value <= 0) {

                    timer.textContent =
                        'Ended';

                    return;

                }

                value--;

                timer.dataset.countdown =
                    value;

                const hours =
                    Math.floor(
                        value / 3600
                    );

                const minutes =
                    Math.floor(
                        (value % 3600) / 60
                    );

                const seconds =
                    value % 60;

                timer.textContent =
    `${String(hours).padStart(2,'0')}:` +
    `${String(minutes).padStart(2,'0')}:` +
    `${String(seconds).padStart(2,'0')}`;

const box = timer.closest('.countdown');
if (box) {
    box.classList.remove('urgent', 'warning');
    if (value <= 600) {
        box.classList.add('urgent');
    } else if (value <= 3600) {
        box.classList.add('warning');
    }
}

            });

        }, 1000);

    },

    /* ======================================================
       MARKET PRICES
    ====================================================== */

    initMarketPrices() {

        const ORACLE_IDS = {
            'BTC / USDC': '0x0a07b833158fbe48d65ae605f0b9e3eea3fd5d6289195e9f7417d011aae1fa0f',
        };

        const BASE = 'https://predict-server.testnet.mystenlabs.com';

        const fetchPrice = async (oracleId) => {
            try {
                const res = await fetch(`${BASE}/oracles/${oracleId}/prices/latest`);
                if (!res.ok) return null;
                const data = await res.json();
                return data?.spot ? data.spot / 1_000_000_000 : null;
            } catch {
                return null;
            }
        };

        const updateCards = async () => {

            const cards = document.querySelectorAll('.pool-card');

            for (const card of cards) {

                const assetEl = card.querySelector('.asset');
                const priceEl = card.querySelector('.live-price');
                const changeEl = card.querySelector('.price-change');

                if (!assetEl || !priceEl) continue;

                const asset = assetEl.textContent.trim();
   const coinId = ORACLE_IDS[asset];
                if (!coinId) continue;

                const newPrice = await fetchPrice(coinId);
                if (newPrice === null) continue;

                const prev = parseFloat(priceEl.dataset.price || newPrice);
                const diff = newPrice - prev;
                const pct  = prev > 0 ? (diff / prev) * 100 : 0;

 priceEl.dataset.price  = newPrice;
                priceEl.textContent    = '$' + (newPrice >= 1000
                    ? newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : newPrice >= 1
                    ? newPrice.toFixed(2)
                    : newPrice.toFixed(4));

                if (changeEl) {
                    const up = diff >= 0;
                    changeEl.textContent = (up ? '↑' : '↓') + ' ' + Math.abs(pct).toFixed(2) + '%';
                    changeEl.className   = 'price-change ' + (up ? 'positive' : 'negative');
                }

                // sync detail page if open
                const detailPrice = document.getElementById('detailLivePrice');
                const detailChange = document.getElementById('detailChange');
                if (detailPrice && document.getElementById('page-pool-detail')?.classList.contains('open')) {
                    const detailAsset = document.getElementById('detailAsset')?.textContent.trim();
                    if (detailAsset === asset) {
                        detailPrice.textContent = priceEl.textContent;
                        if (detailChange) {
                            detailChange.textContent = changeEl.textContent;
                            detailChange.className   = 'detail-change ' + (diff >= 0 ? '' : 'negative');
                        }
                    }
                }

            }

        };

        updateCards();
        setInterval(updateCards, 10000);

    },
    
    
    async initOracleData() {
    const BASE = 'https://predict-server.testnet.mystenlabs.com';

    const pools = [
        {
            cardIndex: 0,
            oracleId: '0x0a07b833158fbe48d65ae605f0b9e3eea3fd5d6289195e9f7417d011aae1fa0f',
        },
       { cardIndex: 1, oracleId: '0x0a07b833158fbe48d65ae605f0b9e3eea3fd5d6289195e9f7417d011aae1fa0f' },
{ cardIndex: 2, oracleId: '0x0a07b833158fbe48d65ae605f0b9e3eea3fd5d6289195e9f7417d011aae1fa0f' },
    ];

    const cards = document.querySelectorAll('.pool-card');

    for (const pool of pools) {
        const card = cards[pool.cardIndex];
        if (!card) continue;

        try {
            const res = await fetch(`${BASE}/oracles/${pool.oracleId}/state`);
            if (!res.ok) continue;
            const data = await res.json();

            // expiry is in milliseconds from the API
            const expiryMs = data?.expiry;
            if (!expiryMs) continue;

            const secsRemaining = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));

            // update countdown data-attribute so initCountdowns() picks it up
            const countdownEl = card.querySelector('[data-countdown]');
            if (countdownEl) {
                countdownEl.dataset.countdown = secsRemaining;
                const h = Math.floor(secsRemaining / 3600);
                const m = Math.floor((secsRemaining % 3600) / 60);
                const s = secsRemaining % 60;
                countdownEl.textContent =
                    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }

        } catch(e) {
            console.warn('Oracle state fetch failed for', pool.oracleId, e);
        }
    }
},

    /* ======================================================
       METRICS
    ====================================================== */

    initMetrics() {

        const metrics =
            document.querySelectorAll(
                '[data-metric]'
            );

        metrics.forEach((metric, index) => {

    const target = Number(metric.dataset.metric);
    const suffix = metric.dataset.suffix || '';

    metric.textContent = '0' + suffix;

    setTimeout(() => {

        let current = 0;
        const duration = 1800;
        const steps = 60;
        const step = target / steps;
        const interval = duration / steps;

        const animation = setInterval(() => {

            current += step;

            if (current >= target) {
                current = target;
                clearInterval(animation);
            }

            metric.textContent = Math.floor(current).toLocaleString() + suffix;

        }, interval);

    }, 300 + index * 120);

});

    },

    /* ======================================================
       BUTTONS
    ====================================================== */

    initButtons() {

    const predInput = document.getElementById('detailPredictionInput');
    const submitBtn = document.getElementById('detailSubmit');

    // disable submit by default
    if (predInput && submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.45';
        submitBtn.style.cursor = 'not-allowed';

        predInput.addEventListener('input', () => {
            const val = parseFloat(predInput.value);
            const valid = !isNaN(val) && val > 0;
            submitBtn.disabled = !valid;
            submitBtn.style.opacity = valid ? '1' : '0.45';
            submitBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
        });
    }

    document.addEventListener('click', event => {

        const target = event.target;

        if (target.matches('.join-btn') || target.closest('.join-btn')) {
            this.openDetailPage(target.closest('.join-btn') || target);
        }

        if (target.matches('#detailBack')) {
            this.closeDetailPage();
        }
        
        if (target.matches('#detailGateConnect')) {
            const walletBtn = document.getElementById('walletBtn');
            if (typeof window.handleConnect === 'function') {
                window.handleConnect(walletBtn);
            }
        }

        if (target.matches('#detailUseCurrentBtn')) {
            const price = document.getElementById('detailLivePrice').textContent.replace('$', '');
            const input = document.getElementById('detailPredictionInput');
            input.value = price;
            // trigger validation
            input.dispatchEvent(new Event('input'));
        }

        if (target.matches('#detailSubmit')) {
    const val = predInput ? predInput.value : '';
    if (!val || isNaN(val) || Number(val) <= 0) {
        if (predInput) predInput.style.borderColor = 'var(--red)';
        return;
    }

    // store prediction against pool
    const poolId = document.getElementById('detailMetaPool')?.textContent?.trim();
    if (poolId) {
        this.state.predictions[poolId] = parseFloat(val);
    }

    const btn = document.getElementById('detailSubmit');
    btn.textContent = 'Prediction Submitted';
    btn.classList.add('success');
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';

    // show position card
    this.showPosition(parseFloat(val));

    setTimeout(() => {
        btn.textContent = 'Prediction Locked In ';
    }, 2200);
}

   if (target.matches('#portfolioConnectBtn')) {
            const walletBtn = document.getElementById('walletBtn');
            if (typeof window.handleConnect === 'function') {
                window.handleConnect(walletBtn);
            }
        }

        if (target.matches('#portfolioGoPoolsBtn')) {
            const poolsNav = document.querySelector('[data-nav="pools"]');
            if (poolsNav) poolsNav.click();
        }

    });

},
    
    openDetailPage(button) {

        const card = button.closest('.pool-card');
        if (!card) return;

        const asset   = card.querySelector('.asset').textContent.trim();
        
        const baseAsset = asset.split(' / ')[0].trim();
const joinBtn = card.querySelector('.join-btn');
if (joinBtn && !joinBtn.dataset.labeled) {
    joinBtn.textContent = `Predict ${baseAsset}  `;
    joinBtn.dataset.labeled = 'true';
    
    // fetch fresh price for detail page
        const oracleMap = {
            'BTC / USDC': '0x0a07b833158fbe48d65ae605f0b9e3eea3fd5d6289195e9f7417d011aae1fa0f',
        };
        const oid = oracleMap[asset];
        if (oid) {
            fetch(`https://predict-server.testnet.mystenlabs.com/oracles/${oid}/prices/latest`)
                .then(r => r.json())
                .then(d => {
                    if (!d?.spot) return;
                    const p = d.spot / 1_000_000_000;
                    const fmt = '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    document.getElementById('detailLivePrice').textContent = fmt;
                    const input = document.getElementById('detailPredictionInput');
                    if (input) input.placeholder = p.toFixed(2);
                    const raw = p;
                    const spread = raw * 0.015;
                    document.getElementById('detailDistMin').textContent = '$' + (raw - spread).toFixed(2);
                    document.getElementById('detailDistMax').textContent = '$' + (raw + spread).toFixed(2);
                    this.renderDistribution(parseInt(preds), raw);
                })
                .catch(() => {});
        }
    
}

        const iconsWrap = document.querySelector('.detail-asset-icons');
        if (iconsWrap) iconsWrap.innerHTML = this.getIconHTML(asset);
        
        const livePriceEl = card.querySelector('.live-price');
const storedPrice = livePriceEl?.dataset.price;
const price = storedPrice && parseFloat(storedPrice) > 0
    ? '$' + parseFloat(storedPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : livePriceEl?.textContent.trim() || '$0.000';
        
        const poolId  = card.querySelector('.pool-id').textContent.trim();
        const stats   = card.querySelectorAll('.pool-stats strong');
        const prize   = stats[0].textContent.trim();
        const preds   = stats[1].textContent.trim();
        const entry   = stats[2].textContent.trim();
        const duration = card.querySelector('.pool-duration').textContent.trim();
        const timerEl = card.querySelector('[data-countdown]');
        const secs    = timerEl ? Number(timerEl.dataset.countdown) : 0;

        // breadcrumb + header
        document.getElementById('detailBcAsset').textContent  = asset;
        document.getElementById('detailAsset').textContent    = asset;
        document.getElementById('detailLivePrice').textContent = price;
        document.getElementById('detailPoolId').textContent   = poolId;
        document.getElementById('detailDuration').textContent = duration;

        // metadata strip
        document.getElementById('detailMetaPool').textContent       = poolId.replace('#','');
        document.getElementById('detailMetaEntry').textContent      = entry;
        document.getElementById('detailMetaPredictors').textContent = preds;
        document.getElementById('detailMetaPrize').textContent      = prize;

        // distribution sub-label
        document.getElementById('detailDistSub').textContent = preds + ' predictions';

        // price range for distribution
        const rawPrice = parseFloat(price.replace(/[$,]/g,''));
        const spread   = rawPrice * 0.015;
        document.getElementById('detailDistMin').textContent = '$' + (rawPrice - spread).toFixed(3);
        document.getElementById('detailDistMax').textContent = '$' + (rawPrice + spread).toFixed(3);

        // generate distribution bars
        this.renderDistribution(parseInt(preds), rawPrice);

        // timers — close and snapshot (snapshot = close + 3600)
        this.startDetailTimers(secs, secs + 3600);

        // clear input
        const input = document.getElementById('detailPredictionInput');
input.value = '';
input.placeholder = price.replace('$', '');
        document.getElementById('detailPredictionInput').style.borderColor = '';

        // load TradingView chart
        this.loadTVChart(asset);

       this.updatePredictGate();

        // open page
        document.getElementById('page-pool-detail').classList.add('open');
        document.body.style.overflow = 'hidden';

    },

    closeDetailPage() {

        document.getElementById('page-pool-detail').classList.remove('open');
        document.body.style.overflow = '';
        if (this._detailTimerInterval) {
            clearInterval(this._detailTimerInterval);
        }

    },

    startDetailTimers(closeSecs, snapshotSecs) {

        if (this._detailTimerInterval) clearInterval(this._detailTimerInterval);

        let c = closeSecs;
        let s = snapshotSecs;

        const fmt = v => {
            if (v <= 0) return '00:00:00';
            const h = Math.floor(v / 3600);
            const m = Math.floor((v % 3600) / 60);
            const sec = v % 60;
            return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        };

        document.getElementById('detailTimerClose').textContent    = fmt(c);
        document.getElementById('detailTimerSnapshot').textContent = fmt(s);

        this._detailTimerInterval = setInterval(() => {
            c--; s--;
            document.getElementById('detailTimerClose').textContent    = fmt(c);
            document.getElementById('detailTimerSnapshot').textContent = fmt(s);
            if (c <= 0 && s <= 0) clearInterval(this._detailTimerInterval);
        }, 1000);

    },

    renderDistribution(totalPreds, centerPrice) {

    const container = document.getElementById('detailDistBars');
    container.innerHTML = '';

    const bins = 20;
    const spread = centerPrice * 0.015;
    const minPrice = centerPrice - spread;
    const bucketSize = (spread * 2) / bins;
    const weights = [];

    for (let i = 0; i < bins; i++) {
        const dist = Math.abs(i - bins / 2);
        weights.push(Math.max(1, Math.round((bins - dist * 1.4) + Math.random() * 4)));
    }

    const max = Math.max(...weights);
    const peakIdx = weights.indexOf(max);
    
    // compute weighted median price for crowd indicator
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    let medianIdx = 0;
    for (let i = 0; i < bins; i++) {
        cumulative += weights[i];
        if (cumulative >= totalWeight / 2) { medianIdx = i; break; }
    }
    const medianPrice = minPrice + (medianIdx + 0.5) * bucketSize;
    const pctDiff = ((medianPrice - centerPrice) / centerPrice) * 100;
    const direction = pctDiff >= 0 ? 'above' : 'below';
    const absPct = Math.abs(pctDiff).toFixed(1);
    const decimals = centerPrice >= 100 ? 2 : 4;
    const crowdEl = document.getElementById('detailCrowdText');
    if (crowdEl) {
        crowdEl.innerHTML = `Most predictors think this closes at <strong>$${medianPrice.toFixed(decimals)}</strong> — ${absPct}% ${direction} current price`;
    }

    weights.forEach((w, i) => {

        const bar = document.createElement('div');
        const bucketMin = minPrice + i * bucketSize;
        const bucketMid = bucketMin + bucketSize / 2;
        const bucketMax = bucketMin + bucketSize;
        const priceLabel = '$' + bucketMid.toFixed(centerPrice >= 100 ? 2 : 4);

        bar.className = 'detail-dist-bar' + (i === peakIdx ? ' peak' : '');
        bar.style.height = Math.max(6, (w / max) * 100) + '%';
        bar.dataset.price = priceLabel;
        bar.dataset.value = bucketMid.toFixed(centerPrice >= 100 ? 2 : 4);
        bar.title = `$${bucketMin.toFixed(centerPrice >= 100 ? 2 : 4)} – $${bucketMax.toFixed(centerPrice >= 100 ? 2 : 4)}`;

        bar.addEventListener('click', () => {

            // clear previous selection
            container.querySelectorAll('.detail-dist-bar')
                .forEach(b => b.classList.remove('selected'));

            bar.classList.remove('peak');
            bar.classList.add('selected');

            // fill input
            const input = document.getElementById('detailPredictionInput');
            input.value = bar.dataset.value;

            // flash input border
            const wrap = input.closest('.detail-input-wrap');
            if (wrap) {
                wrap.style.borderColor = 'var(--accent)';
                wrap.style.boxShadow = '0 0 0 3px var(--accent-soft)';
                setTimeout(() => {
                    wrap.style.boxShadow = '';
                }, 600);
            }

            // scroll to input smoothly
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            input.focus();

        });

        container.appendChild(bar);

    });

},

    loadTVChart(asset) {

    const container = document.getElementById('tradingview_chart');
    container.innerHTML = '';

    const symbolMap = {
        'SUI / USDC': 'COINBASE:SUIUSD',
        'ETH / USDC': 'COINBASE:ETHUSD',
        'SOL / USDC': 'COINBASE:SOLUSD',
        'BTC / USDC': 'COINBASE:BTCUSD',
    };

    const symbol = encodeURIComponent(symbolMap[asset] || 'COINBASE:SUIUSD');
    const isDark = document.body.classList.contains('dark');
    const tvTheme = isDark ? 'dark' : 'light';

    const iframe = document.createElement('iframe');
    iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tv_detail&symbol=${symbol}&interval=60&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=0&saveimage=0&studies=%5B%5D&theme=${tvTheme}&style=1&timezone=UTC&withdateranges=1&locale=en`;
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowfullscreen', '');

    container.appendChild(iframe);

},

    /* ======================================================
       THEME
    ====================================================== */

    initTheme() {

        const themeToggle =
            document.querySelector(
                '[data-theme]'
            );

        if (!themeToggle) return;

        themeToggle.addEventListener(
            'click',
            () => {

                document.body.classList.toggle('dark');
                
                const chartAsset = document.getElementById('detailAsset')?.textContent?.trim();
if (chartAsset && document.getElementById('page-pool-detail')?.classList.contains('open')) {
    this.loadTVChart(chartAsset);
}

            }
        );

    },
    
    
    initSidebar() {

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('navHamburger');
    if (!sidebar || !overlay || !hamburger) return;

    const open = () => {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    const close = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    };

    hamburger.addEventListener('click', open);
    overlay.addEventListener('click', close);

    // sidebar nav items
    document.querySelectorAll('[data-sidebar-nav]').forEach(item => {
        item.addEventListener('click', () => {

            const target = item.dataset.sidebarNav;

            // update sidebar active state
            document.querySelectorAll('[data-sidebar-nav]').forEach(n => {
                n.classList.remove('active');
            });
            item.classList.add('active');

            // sync bottom nav
            const bottomNav = document.querySelector(`[data-nav="${target}"]`);
            if (bottomNav) {
                document.querySelectorAll('[data-nav]').forEach(n => n.classList.remove('active'));
                bottomNav.classList.add('active');
            }

            // show correct page
            const pages = ['page-pools', 'page-portfolio', 'page-leaderboard', 'page-propose'];
            pages.forEach(p => {
                const el = document.getElementById(p);
                if (el) el.style.display = 'none';
            });

            const pageMap = {
                'pools': 'page-pools',
                'portfolio': 'page-portfolio',
                'leaderboard': 'page-leaderboard',
                'propose': 'page-propose',
                'labs': 'page-pools' // placeholder
            };

            const pageId = pageMap[target];
            if (pageId) {
                const page = document.getElementById(pageId);
                if (page) page.style.display = '';
            }

            if (target === 'portfolio') this.renderPortfolio();

            close();

        });
    });

    // update sidebar wallet state when wallet connects
    window.addEventListener('slete:walletUpdate', (e) => {
        const dot = document.getElementById('sidebarWalletDot');
        const label = document.getElementById('sidebarWalletLabel');
        if (!dot || !label) return;
        if (e.detail.connected) {
            dot.className = 'sidebar-wallet-dot connected';
            const addr = e.detail.address;
            label.textContent = addr ? addr.slice(0,6) + '...' + addr.slice(-4) : 'Connected';
        } else {
            dot.className = 'sidebar-wallet-dot disconnected';
            label.textContent = 'Not connected';
        }
    });

},


initPropose() {

    const state = { asset: 'SUI', duration: '24', fee: '1' };

    // asset chip selection
    document.querySelectorAll('.propose-asset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.propose-asset-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.asset = chip.dataset.asset;
            const pairEl = document.getElementById('proposeSelectedPair');
            if (pairEl) pairEl.textContent = state.asset + ' / USDC';
        });
    });

    // duration options
    document.querySelectorAll('[data-duration]').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('[data-duration]').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            state.duration = opt.dataset.duration;
        });
    });

    // fee options
    document.querySelectorAll('[data-fee]').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('[data-fee]').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            state.fee = opt.dataset.fee;
        });
    });

    // step navigation
    const goToStep = (step) => {
        ['proposeStep1','proposeStep2','proposeStep3'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.style.display = i + 1 === step ? '' : 'none';
        });
        document.querySelectorAll('.propose-step').forEach((el, i) => {
            el.classList.remove('active', 'done');
            if (i + 1 === step) el.classList.add('active');
            if (i + 1 < step) el.classList.add('done');
        });
    };

    document.getElementById('proposeNext1')?.addEventListener('click', () => {
        goToStep(2);
    });

    document.getElementById('proposeNext2')?.addEventListener('click', () => {
        // populate review
        document.getElementById('reviewPair').textContent = state.asset + ' / USDC';
        document.getElementById('reviewDuration').textContent = state.duration + 'H';
        document.getElementById('reviewFee').textContent = state.fee + ' USDC';
        // show gate or form based on wallet
        const gate = document.getElementById('proposeGate');
        const form = document.getElementById('proposeForm');
        if (gate && form) {
            if (this.state.walletConnected) {
                gate.style.display = 'none';
                form.style.display = 'block';
            } else {
                gate.style.display = 'block';
                form.style.display = 'none';
            }
        }
        goToStep(3);
    });

    document.getElementById('proposeBack2')?.addEventListener('click', () => goToStep(1));
    document.getElementById('proposeBack3')?.addEventListener('click', () => goToStep(2));

    document.getElementById('proposeConnectBtn')?.addEventListener('click', () => {
        const walletBtn = document.getElementById('walletBtn');
        if (typeof window.handleConnect === 'function') {
            window.handleConnect(walletBtn);
        }
    });

    document.getElementById('proposeSubmitBtn')?.addEventListener('click', () => {
        const btn = document.getElementById('proposeSubmitBtn');
        btn.textContent = 'Submitting...';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = 'Proposal Submitted';
            btn.style.background = 'var(--green)';
        }, 1800);
    });

},

    /* ======================================================
       OBSERVERS
    ====================================================== */

    initObservers() {
    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        {
            threshold: 0.15
        }
    );

    document
        .querySelectorAll('.pool-card, .metric-card')
        .forEach(el => observer.observe(el));
},

renderCardIcons() {
    document.querySelectorAll('.pool-card').forEach(card => {
        const assetEl = card.querySelector('.asset');
        const iconWrap = card.querySelector('.card-asset-icons');

        if (!assetEl || !iconWrap) return;

        iconWrap.innerHTML = this.getIconHTML(
            assetEl.textContent.trim()
        );
    });
},

    /* ======================================================
       UTILITIES
    ====================================================== */

    formatCurrency(value) {

        return new Intl.NumberFormat(
            'en-US',
            {
                style: 'currency',
                currency: 'USD'
            }
        ).format(value);

    },

    formatNumber(value) {

        return Number(value)
            .toLocaleString();

    }

};

/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        Slete.init();

    }
);