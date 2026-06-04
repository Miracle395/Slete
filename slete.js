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

        initialized: false

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

        this.initMetrics();

        this.initMarketPrices();

        this.initButtons();

        this.initTheme();

        this.initObservers();

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

        navItems.forEach(item => {

            item.addEventListener(
                'click',
                () => {

                    navItems.forEach(nav =>
                        nav.classList.remove(
                            'active'
                        )
                    );

                    item.classList.add(
                        'active'
                    );

                }
            );

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

        const btn = document.querySelector('.btn-connect');
        if (!btn) return;

        btn.addEventListener('click', () => {
            if (typeof window.handleConnect === 'function') {
                window.handleConnect(btn);
            }
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

            });

        }, 1000);

    },

    /* ======================================================
       MARKET PRICES
    ====================================================== */

    initMarketPrices() {

        const COIN_IDS = {
            'SUI / USDC': 'sui',
            'ETH / USDC': 'ethereum',
            'SOL / USDC': 'solana',
        };

        const fetchPrice = async (coinId) => {
            try {
                const res = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
                );
                if (!res.ok) return null;
                const data = await res.json();
                return data?.[coinId]?.usd ?? null;
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
   const coinId = COIN_IDS[asset];
                if (!coinId) continue;

                const newPrice = await fetchPrice(coinId);
                if (newPrice === null) continue;

                const prev = parseFloat(priceEl.dataset.price || newPrice);
                const diff = newPrice - prev;
                const pct  = prev > 0 ? (diff / prev) * 100 : 0;

                priceEl.dataset.price  = newPrice;
                priceEl.textContent    = '$' + (newPrice >= 100
                    ? newPrice.toFixed(2)
                    : newPrice.toFixed(3));

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

    /* ======================================================
       METRICS
    ====================================================== */

    initMetrics() {

        const metrics =
            document.querySelectorAll(
                '[data-metric]'
            );

        metrics.forEach(metric => {

            const target =
                Number(
                    metric.dataset.metric
                );

            const suffix =
                metric.dataset.suffix || '';

            let current = 0;

            const step =
                target / 80;

            const animation =
                setInterval(() => {

                    current += step;

                    if (
                        current >= target
                    ) {

                        current = target;

                        clearInterval(
                            animation
                        );

                    }

                    metric.textContent =
                        Math.floor(current)
                            .toLocaleString() + suffix;

                }, 16);

        });

    },

    /* ======================================================
       BUTTONS
    ====================================================== */

    initButtons() {

        document.addEventListener('click', event => {

            const target = event.target;

            if (target.matches('.join-btn') || target.closest('.join-btn')) {
                this.openDetailPage(target.closest('.join-btn') || target);
            }

            if (target.matches('#detailBack')) {
                this.closeDetailPage();
            }

            if (target.matches('#detailUseCurrentBtn')) {
                const price = document.getElementById('detailLivePrice').textContent.replace('$','');
                document.getElementById('detailPredictionInput').value = price;
            }

            if (target.matches('#detailSubmit')) {
                const val = document.getElementById('detailPredictionInput').value;
                if (!val || isNaN(val) || Number(val) <= 0) {
                    document.getElementById('detailPredictionInput').style.borderColor = '#ef4444';
                    return;
                }
                const btn = document.getElementById('detailSubmit');
                btn.textContent = '✓ Prediction Submitted';
                btn.classList.add('success');
                setTimeout(() => {
                    btn.textContent = 'Confirm Prediction →';
                    btn.classList.remove('success');
                }, 2200);
            }

        });

    },

    openDetailPage(button) {

        const card = button.closest('.pool-card');
        if (!card) return;

        const asset   = card.querySelector('.asset').textContent.trim();
        const price   = card.querySelector('.live-price').textContent.trim();
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
        document.getElementById('detailPredictionInput').value = '';
        document.getElementById('detailPredictionInput').style.borderColor = '';

        // load TradingView chart
        this.loadTVChart(asset);

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
        const weights = [];

        for (let i = 0; i < bins; i++) {
            const dist = Math.abs(i - bins / 2);
            weights.push(Math.max(1, Math.round((bins - dist * 1.4) + Math.random() * 4)));
        }

        const max = Math.max(...weights);
        const peakIdx = weights.indexOf(max);

        weights.forEach((w, i) => {
            const bar = document.createElement('div');
            bar.className = 'detail-dist-bar' + (i === peakIdx ? ' peak' : '');
            bar.style.height = Math.max(6, (w / max) * 100) + '%';
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
        };

        const symbol = encodeURIComponent(symbolMap[asset] || 'COINBASE:SUIUSD');

        const iframe = document.createElement('iframe');
        iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tv_detail&symbol=${symbol}&interval=60&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=0&saveimage=0&studies=%5B%5D&theme=light&style=1&timezone=UTC&withdateranges=1&locale=en`;
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

                document.body.classList.toggle(
                    'dark'
                );

            }
        );

    },

    /* ======================================================
       OBSERVERS
    ====================================================== */

    initObservers() {

        const observer =
            new IntersectionObserver(
                entries => {

                    entries.forEach(
                        entry => {

                            if (
                                entry.isIntersecting
                            ) {

                                entry.target.classList.add(
                                    'visible'
                                );

                            }

                        }
                    );

                },
                {
                    threshold: .15
                }
            );

        document
            .querySelectorAll(
                '.pool-card, .metric-card'
            )
            .forEach(el =>
                observer.observe(el)
            );

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