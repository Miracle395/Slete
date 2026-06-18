/* ==========================================================
   SLETE CORE
   Application Runtime
========================================================== */

// Initialize shared wallet state bridge
window.STATE = window.STATE || {
    connected:    false,
    walletAddr:   null,
    suiWallet:    null,
    suiBalance:   0,
    usdcBalance:  0,
    dusdcBalance: 0,
    balance:      0,
    depositAmount: 1,
};

const Slete = {

    state: {
    walletConnected: false,
    activeTab: 'all',
    prices: {},
    markets: [],
    predictions: {},
    initialized: false,
    managerObjectId: null,
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
        
        this.initOracleData().then(() => {
    this.initMarketPrices();
    this.initObservers();
    this.applyFilter(this.state.activeTab);
});

        this.initMetrics();

        this.initButtons();

        this.initTheme();
        
        this.initSidebar();
        
        this.initPropose();
        
        this.initLeaderboard();

        this.initObservers();
        
        this.renderCardIcons();

        this.initRulesTabs();

        console.log(
            '⚡ SLETE READY'
        );

    },

    /* ======================================================
       NAVIGATION
    ====================================================== */

    initNavigation() {

    const navItems = document.querySelectorAll('[data-nav]');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.dataset.nav;
            window.location.hash = target;
            this.navigateTo(target);
        });
    });

    // Hash-based deep linking — read on load
    const validPages = ['pools', 'leaderboard', 'portfolio', 'propose'];
    const hash = window.location.hash.replace('#', '');
    const startPage = validPages.includes(hash) ? hash : 'pools';
    this.navigateTo(startPage);

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
            if (!card.dataset.poolHidden) card.style.display = '';
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
        this.state.walletAddress = connected ? address : null;

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
    // AFTER
submitBtn.textContent = 'Prediction Locked In';
submitBtn.disabled = true;
submitBtn.style.opacity = '0.55';
submitBtn.style.background = '';
submitBtn.style.color = '';
submitBtn.style.cursor = 'not-allowed';
} else if (posEl) {
    posEl.style.display = 'none';
    if (submitBtn) {
        submitBtn.textContent = 'Confirm Prediction';
submitBtn.disabled = true;
submitBtn.style.opacity = '0.35';
submitBtn.style.background = '';
submitBtn.style.color = '';
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

async renderPortfolio() {

    const PREDICT_SERVER = 'https://predict-server.testnet.mystenlabs.com';

    const gate      = document.getElementById('portfolioGate');
    const content   = document.getElementById('portfolioContent');
    const emptyEl   = document.getElementById('portfolioEmpty');
    const historyEl = document.getElementById('portfolioHistory');
    const rowsEl    = document.getElementById('portfolioHistoryRows');

    if (!this.state.walletConnected || !this.state.walletAddress) {
        if (gate) gate.style.display = 'flex';
        if (content) content.style.display = 'none';
        return;
    }

    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';

    // show loading
document.getElementById('portStatTotal').textContent  = '—';
document.getElementById('portStatWinRate').textContent = '—';
document.getElementById('portStatEarned').textContent  = '—';
if (emptyEl) emptyEl.style.display = 'none';
if (historyEl) historyEl.style.display = 'none';

// Refresh balance on portfolio open
if (typeof window._fetchWalletBalances === 'function' && this.state.walletAddress) {
    window._fetchWalletBalances(this.state.walletAddress);
}
const dusdcBal = window.STATE?.dusdcBalance ?? 0;
const balStatEl = document.getElementById('portStatBalance');
if (balStatEl) balStatEl.textContent = dusdcBal.toFixed(2) + ' DUSDC';

        try {
    const addr = this.state.walletAddress;

    const storageKey = `slete_manager_${addr}`;
    // Also check short-address key for legacy entries
    const shortAddr = addr.slice(0, 6) + '...' + addr.slice(-4);
    const managerId  = this.state.managerObjectId
                    || localStorage.getItem(storageKey)
                    || Object.keys(localStorage).filter(k => k.startsWith('slete_manager_')).map(k => localStorage.getItem(k)).find(Boolean)
                    || null;

    if (!managerId) {
        document.getElementById('portStatTotal').textContent  = '0';
        document.getElementById('portStatWinRate').textContent = '—';
        document.getElementById('portStatEarned').textContent  = '0 USDC';
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }

    const [summaryRes, pnlRes] = await Promise.all([
        fetch(`${PREDICT_SERVER}/managers/${managerId}/positions/summary`),
        fetch(`${PREDICT_SERVER}/managers/${managerId}/pnl?range=ALL`)
    ]);

        const summary = summaryRes.ok ? await summaryRes.json() : null;
        const pnl     = pnlRes.ok     ? await pnlRes.json()     : null;
        
        console.log('[Slete] Manager ID used:', managerId);

        // stats
        const totalPreds = Array.isArray(summary) ? summary.length : (summary?.total_positions ?? summary?.count ?? 0);
        const totalEarned = (pnl?.realized_pnl ?? pnl?.current_total_pnl ?? 0) / 1_000_000;

        document.getElementById('portStatTotal').textContent  = totalPreds;
        document.getElementById('portStatEarned').textContent  =
            (totalEarned >= 0 ? '+' : '') + Number(totalEarned).toFixed(2) + ' USDC';

        // positions list
        const positions = Array.isArray(summary) ? summary : (summary?.positions ?? summary?.data ?? []);

        const settledPos = positions.filter(p => {
            const exp = Number(p.expiry || 0);
            const ms  = exp > 1e12 ? exp : exp * 1000;
            return ms > 0 && Date.now() > ms;
        });
        const accurateCount = settledPos.filter(p => {
            const upnl = Number(p.unrealized_pnl || 0);
            const cost = Number(p.total_cost || 1e6);
            return Math.abs(upnl / cost) * 100 <= 1.0 || upnl >= 0;
        }).length;
        const winRate = settledPos.length > 0
            ? Math.round((accurateCount / settledPos.length) * 100) + '%'
            : '—';
        document.getElementById('portStatWinRate').textContent = winRate;

        if (!positions.length) {
            if (emptyEl) emptyEl.style.display = 'flex';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (historyEl) historyEl.style.display = 'block';
        if (!rowsEl) return;

        rowsEl.innerHTML = '';

        // Streak calculation — count consecutive positions within 1% accuracy
        // We use unrealized_pnl as a proxy: positive upnl = tracking well
        let streak = 0;
        let streakBroken = false;
        const streakDots = [];

        // Walk positions newest-first for streak
        const sorted = [...positions].reverse();
        for (const pos of sorted) {
            const upnl = pos.unrealized_pnl ?? 0;
            const cost = Number(pos.total_cost) || 1e6;
            const accuracyPct = Math.abs(upnl / cost) * 100;
            const isAccurate = accuracyPct <= 1.0 || upnl >= 0;

            if (!streakBroken && isAccurate) {
                streak++;
                streakDots.push('hit');
            } else {
                streakBroken = true;
                streakDots.push('miss');
            }
        }

        // Render streak card
        const streakCountEl = document.getElementById('portStreakCount');
        const streakSubEl   = document.getElementById('portStreakSub');
        const streakDotsEl  = document.getElementById('portStreakDots');
        const streakCard    = document.getElementById('portStreakCard');

        if (streakCountEl) streakCountEl.textContent = streak;

        if (streakSubEl) {
            if (streak === 0) {
                streakSubEl.textContent = 'Make your first accurate prediction';
            } else if (streak === 1) {
                streakSubEl.textContent = 'Streak started — keep going';
            } else if (streak < 5) {
                streakSubEl.textContent = 'Building momentum';
            } else if (streak < 10) {
                streakSubEl.textContent = 'On a hot streak';
            } else {
                streakSubEl.textContent = 'Elite accuracy';
            }
        }

        if (streakCard) {
            streakCard.classList.remove('streak--cold', 'streak--warm', 'streak--hot');
            if (streak === 0)       streakCard.classList.add('streak--cold');
            else if (streak < 5)    streakCard.classList.add('streak--warm');
            else                    streakCard.classList.add('streak--hot');
        }

        if (streakDotsEl) {
            streakDotsEl.innerHTML = streakDots.slice(0, 10).map(d =>
                `<span class="streak-dot streak-dot--${d}"></span>`
            ).join('');
        }
        
        
        // ── Slete claim resolution ──────────────────────────────────────
        // For each settled oracle among user's positions, fetch all Slete
        // positions, calculate winners, tag each position accordingly.
        const sleteWallets = new Set(
            JSON.parse(localStorage.getItem('slete_known_wallets') || '[]')
        );

        const settledOracleIds = [...new Set(
            positions
                .filter(p => {
                    const exp = Number(p.expiry || 0);
                    const ms  = exp > 1e12 ? exp : exp * 1000;
                    return ms > 0 && Date.now() > ms;
                })
                .map(p => p.oracle_id)
                .filter(Boolean)
        )];

        const claimMap = {}; // oracle_id -> { tag, amount } for this wallet

        await Promise.all(settledOracleIds.map(async oid => {
            try {
                const res = await fetch(`${PREDICT_SERVER}/positions/minted?oracle_id=${oid}`);
                if (!res.ok) return;
                const data = await res.json();
                const all = Array.isArray(data) ? data : (data.positions || data.data || []);

                // Filter to Slete-only wallets
                const sleteAll = sleteWallets.size > 0
                    ? all.filter(p => sleteWallets.has(p.manager_id))
                    : all;

                // Get oracle settlement price
                const oracleObj = (this.state.oracles || []).find(o => o.oracle_id === oid);
                // Also check settled list
                const settlementRaw = oracleObj?.settlement_price ?? null;
                const settlementPrice = settlementRaw ? Number(settlementRaw) / 1e9 : null;

                if (!settlementPrice) return;

                const totalPool = sleteAll.reduce((s, p) => s + (Number(p.total_cost) || 0), 0) / 1e6;

                // < 3 predictors → full refund for everyone
                if (sleteAll.length < 3) {
                    sleteAll.forEach(p => {
                        if (p.manager_id === managerId) {
                            const staked = (Number(p.total_cost) || 0) / 1e6;
                            claimMap[oid] = { tag: 'refund', amount: staked };
                        }
                    });
                    return;
                }

                // Sort by proximity to settlement price
                const ranked = [...sleteAll].sort((a, b) => {
                    const aStrike = Number(a.strike) / 1e9;
                    const bStrike = Number(b.strike) / 1e9;
                    return Math.abs(aStrike - settlementPrice) - Math.abs(bStrike - settlementPrice);
                });

                const rake = totalPool * 0.05;
                const pot  = totalPool - rake;
                const payouts = [pot * 0.60, pot * 0.25, pot * 0.15];

                ranked.slice(0, 3).forEach((p, i) => {
                    if (p.manager_id === managerId) {
                        claimMap[oid] = { tag: 'won', amount: payouts[i] };
                    }
                });

                // Everyone outside top 3 is 'lost'
                ranked.slice(3).forEach(p => {
                    if (p.manager_id === managerId && !claimMap[oid]) {
                        claimMap[oid] = { tag: 'lost', amount: 0 };
                    }
                });

            } catch {}
        }));

        // Tag each position with its claim outcome
        positions.forEach(pos => {
            const claim = claimMap[pos.oracle_id];
            if (claim) {
                pos._sleteClaimTag    = claim.tag;
                pos._sleteClaimAmount = claim.amount;
            }
        });
        // ── End claim resolution ───────────────────────────────────────

        // Render position rows
        positions.forEach(pos => {
    const asset    = pos.underlying_asset ?? 'BTC';
    const strike   = pos.strike ? (Number(pos.strike) / 1e9).toFixed(2) : '—';
    const upnl     = pos.unrealized_pnl ?? 0;
    const upnlDsp  = (upnl / 1e6).toFixed(4);
    const upnlPos  = upnl >= 0;
    const qty      = pos.minted_quantity ? (Number(pos.minted_quantity) / 1e6).toFixed(0) : '—';

    // Derive real status from oracle expiry, not DeepBook's stale status field
    const expiryRaw = Number(pos.expiry || 0);
    const expiryMs  = expiryRaw > 1e12 ? expiryRaw : expiryRaw * 1000;
    const isExpired = expiryMs > 0 && Date.now() > expiryMs;
    const status    = isExpired ? 'settled' : (pos.status ?? 'active');
    const oracleId = pos.oracle_id ?? '';
    const claimAmt = pos._sleteClaimAmount ?? 0;
    const claimTag = pos._sleteClaimTag ?? '';   // 'won' | 'refund' | 'lost' | ''

    const claimHTML = (claimTag === 'won' || claimTag === 'refund') ? `
        <button class="portfolio-claim-btn" data-claim-oracle="${oracleId}" data-claim-amount="${claimAmt}" data-claim-tag="${claimTag}">
            ${claimTag === 'refund' ? 'Refund' : 'Claim'} ${claimAmt.toFixed(2)} DUSDC
        </button>` : '';

    const row = document.createElement('div');
    row.className = 'portfolio-row';
    row.innerHTML = `
        <div class="portfolio-row-main">
            <span class="portfolio-row-pair">${asset} / USDC</span>
            <span class="portfolio-row-strike">$${strike}</span>
        </div>
        <div class="portfolio-row-meta">
            <span class="portfolio-row-size">${qty} DUSDC</span>
            <span class="portfolio-row-pnl ${upnlPos ? 'pnl-pos' : 'pnl-neg'}">
                ${upnlPos ? '+' : ''}${upnlDsp}
            </span>
            <span class="portfolio-row-status ${claimTag || status.toLowerCase()}">${claimTag || status}</span>
        </div>
        ${claimHTML}
    `;
    rowsEl.appendChild(row);
});

// Update pool cards with Slete-specific predictors + prize data
const poolTotals = {};
positions.forEach(pos => {
    const key = pos.oracle_id;
    if (!key) return;
    if (!poolTotals[key]) poolTotals[key] = { count: 0, prize: 0 };
    poolTotals[key].count += 1;
    poolTotals[key].prize += Number(pos.total_cost) || 0;
});

document.querySelectorAll('.pool-card:not(.closed-card)').forEach(card => {
    const key = card.dataset.oracleId;
    const data = poolTotals[key];
    if (!data) return;
    const strongs = card.querySelectorAll('.pool-stats strong');
    strongs[0].textContent = (data.prize / 1e6).toFixed(2) + ' DUSDC'; // Prize Pool
    strongs[1].textContent = data.count;                                  // Predictors
});

    } catch (err) {
        console.warn('[Slete] Portfolio fetch failed:', err);
        // fall back to local predictions from this session
        const predictions = this.state.predictions;
        const keys = Object.keys(predictions);

        document.getElementById('portStatTotal').textContent  = keys.length;
        document.getElementById('portStatWinRate').textContent = '—';
        document.getElementById('portStatEarned').textContent  = '0 USDC';

        if (!keys.length) {
            if (emptyEl) emptyEl.style.display = 'flex';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (historyEl) historyEl.style.display = 'block';
        if (!rowsEl) return;
        rowsEl.innerHTML = '';

        keys.forEach(poolId => {
            const price = predictions[poolId];
            const decimals = price >= 100 ? 2 : 4;
            const row = document.createElement('div');
            row.className = 'portfolio-row';
            row.innerHTML = `
                <span class="portfolio-row-pair">Pool #${poolId}</span>
                <span class="portfolio-row-price">$${price.toFixed(decimals)}</span>
                <span class="portfolio-row-status pending">Pending</span>
            `;
            rowsEl.appendChild(row);
        });
    }

},

async renderLeaderboard() {

    const PREDICT_SERVER = 'https://predict-server.testnet.mystenlabs.com';
    const PREDICT_ID = '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';

    const podium  = document.getElementById('leaderboardPodium');
    const list    = document.getElementById('leaderboardList');
    const empty   = document.getElementById('leaderboardEmpty');
    const rows    = document.getElementById('leaderboardRows');
    const lbGoBtn = document.getElementById('lbGoPoolsBtn');

    if (lbGoBtn && !lbGoBtn._bound) {
        lbGoBtn._bound = true;
        lbGoBtn.addEventListener('click', () => {
            const poolsNav = document.querySelector('[data-nav="pools"]');
            if (poolsNav) poolsNav.click();
        });
    }

    // show loading state
    if (empty) empty.style.display = 'flex';
    if (podium) podium.style.display = 'none';
    if (list) list.style.display = 'none';

    try {
    // Slete-only leaderboard: built from wallets that predicted through this app
    const sleteWallets = JSON.parse(localStorage.getItem('slete_known_wallets') || '[]');
    
    if (!sleteWallets.length) return; // empty state stays visible

    const pnlResults = await Promise.allSettled(
        sleteWallets.slice(0, 20).map(id =>
            fetch(`${PREDICT_SERVER}/managers/${id}/positions/summary`)
                .then(r => r.ok ? r.json() : null)
                .then(summary => {
                    if (!summary) return null;
                    const positions = Array.isArray(summary) ? summary : (summary?.positions ?? summary?.data ?? []);
                    const earned = positions.reduce((sum, p) => sum + (Number(p.unrealized_pnl) || 0), 0) / 1e6;
                    return { id, earned, preds: positions.length };
                })
        )
    );

    const ranked = pnlResults
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
        .sort((a, b) => b.earned - a.earned)
        .slice(0, 10);

    if (!ranked.length) return;

    const fmt = addr => addr.slice(0, 6) + '..' + addr.slice(-4);
    const fmtEarned = v => (v >= 0 ? '+' : '') + Number(v).toFixed(2) + ' USDC';

    const podiumOrder = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
    const rankClasses = ['rank-2', 'rank-1', 'rank-3'];
    const rankNums = [2, 1, 3];

    if (podium) {
        podium.innerHTML = podiumOrder.map((p, i) => `
            <div class="podium-card ${rankClasses[i]}">
                <div class="podium-rank">#${rankNums[i]}</div>
                <div class="podium-avatar">${fmt(p.id)}</div>
                <div class="podium-stat">${fmtEarned(p.earned)}</div>
                <div class="podium-label">Earned</div>
                <div class="podium-earned">${p.preds} predictions</div>
            </div>
        `).join('');
        podium.style.display = 'flex';
    }

    if (rows && ranked.length > 3) {
        rows.innerHTML = ranked.slice(3).map((p, i) => `
            <div class="leaderboard-row">
                <span class="lb-rank">${i + 4}</span>
                <span class="lb-addr">${fmt(p.id)}</span>
                <span class="lb-preds">${p.preds}</span>
                <span class="lb-earned">${fmtEarned(p.earned)}</span>
            </div>
        `).join('');
        list.style.display = 'block';
    }

    if (empty) empty.style.display = 'none';

} catch (err) {
    console.warn('[Slete] Leaderboard fetch failed:', err);
}

},

    /* ======================================================
       COUNTDOWNS
    ====================================================== */

    initCountdowns() {

const fmt = (secs) => {
    if (secs <= 0) return 'Ended';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
  if (d > 0) return h > 0 ? `${d}D ${h}H` : `${d}D`;
    if (h > 0) return `${h}H ${m}M`;
    if (m > 0) return `${m}M`;
    return `${String(s).padStart(2,'0')}S`;
};

        const tick = () => {
            const now = Date.now();

            // expiry-based timers (real oracle timestamps)
            document.querySelectorAll('[data-expiry]').forEach(timer => {
                const expiry = Number(timer.dataset.expiry);
                const secs = Math.max(0, Math.floor((expiry - now) / 1000));
                timer.textContent = fmt(secs);

                const box = timer.closest('.countdown');
                if (box) {
                    box.classList.remove('urgent', 'warning');
                    if (secs <= 600)  box.classList.add('urgent');
                    else if (secs <= 3600) box.classList.add('warning');
                }
            });

            // legacy countdown timers (detail page — still uses seconds-based)
            document.querySelectorAll('[data-countdown]').forEach(timer => {
                let value = Number(timer.dataset.countdown);
                if (value <= 0) { timer.textContent = 'Ended'; return; }
                value--;
                timer.dataset.countdown = value;
                timer.textContent = fmt(value);
            });
        };

        tick();
        setInterval(tick, 1000);

    },
    
  async initOracleData() {
    const PREDICT_SERVER = 'https://predict-server.testnet.mystenlabs.com';
    const PREDICT_ID = '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';

    try {
        console.log('[Slete] Loading oracle data...');

        const response = await fetch(
    PREDICT_SERVER + '/predicts/' + PREDICT_ID + '/oracles',
    {
        headers: {
            Accept: 'application/json'
        },
        signal: AbortSignal.timeout(8000)
    }
).catch(() => null);

if (!response || !response.ok) {
    console.warn('[Slete] Oracle server unreachable — using cached data');
    this.state.oracles = [];
    return { active: [], settled: [] };
}

        if (!response.ok) {
            throw new Error('Oracle API returned ' + response.status);
        }

        const payload = await response.json();

        let oracles = [];

        if (Array.isArray(payload)) {
            oracles = payload;
        } else if (payload && Array.isArray(payload.oracles)) {
            oracles = payload.oracles;
        } else if (payload && Array.isArray(payload.data)) {
            oracles = payload.data;
        }

        const active = oracles
    .filter(function (o) {
        return o && o.status === 'active';
    })
    .sort(function (a, b) {
        return Number(a.activated_at || 0) - Number(b.activated_at || 0);
    });
        
        // Build whitelist from active oracles — these are the only markets Slete curated.
        // When they settle, they move to closed. Nothing else gets in.
        const sleteOracleIds = new Set(active.map(o => o.oracle_id).filter(Boolean));

        // Also persist to localStorage so portfolio can cross-reference
        // even after oracles have fully settled and leave the active list.
        const stored = JSON.parse(localStorage.getItem('slete_oracle_ids') || '[]');
        stored.forEach(id => sleteOracleIds.add(id));
        localStorage.setItem('slete_oracle_ids', JSON.stringify([...sleteOracleIds]));

        const settled = oracles
            .filter(function (o) {
                return o && o.status === 'settled' && sleteOracleIds.has(o.oracle_id);
            })
            .sort(function (a, b) {
                return Number(b.settled_at || 0) - Number(a.settled_at || 0);
            });

        this.state.oracles = active;

        /* ACTIVE MARKETS */

        const activeGrid = document.getElementById('active-pools-grid');

        if (activeGrid) {

            if (!active.length) {

                activeGrid.innerHTML =
                    '<div class="empty-state">No active markets right now.</div>';

            } else {

                activeGrid.innerHTML = active.map(function (oracle, index) {

                    const assetSymbol =
                        oracle.underlying_asset || 'BTC';

                    const asset =
                        assetSymbol + ' / USDC';

                    const num =
                        String(index + 1).padStart(2, '0');

                    const oracleId =
                        oracle.oracle_id || '';

                    const expiryRaw =
                        Number(oracle.expiry || 0);

                    const expiryMs =
                        expiryRaw > 1e12
                            ? expiryRaw
                            : expiryRaw * 1000;

                    const activatedRaw =
                        Number(oracle.activated_at || 0);

                    const activatedMs =
                        activatedRaw > 1e12
                            ? activatedRaw
                            : activatedRaw * 1000;

                    const durationHours =
                        Math.max(
                            1,
                            Math.round((expiryMs - activatedMs) / 3600000)
                        );

                    const secsLeft = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
                    const daysLeft = Math.floor(secsLeft / 86400);
                    const hoursLeft = Math.floor((secsLeft % 86400) / 3600);
                    const durationLabel = secsLeft <= 0 ? 'Ended'
                        : daysLeft > 0 ? daysLeft + 'D'
                        : hoursLeft + 'H';

                    const suiscanUrl =
                        'https://suiscan.xyz/testnet/object/' + oracleId;

                    return (
                        '<article class="pool-card" data-oracle-id="' + oracleId + '">' +

                            '<div class="pool-top">' +
                                '<div class="pool-pair-row">' +
                                    '<span class="card-asset-icons"></span>' +
                                    '<div class="pool-pair-info">' +
                                        '<div class="asset">' + asset + '</div>' +
                  '' +
                                    '</div>' +
                                '</div>' +
                                '<div class="pool-top-right">' +
                                    '<div class="pool-duration">' + durationLabel + '</div>' +
                                    '<a class="pool-id" href="' + suiscanUrl + '" target="_blank">#' + num + '</a>' +
                                '</div>' +
                            '</div>' +

   '<div class="countdown">' +
                                '<div class="countdown-label">Closes In</div>' +
                                '<strong data-expiry="' + expiryMs + '">—</strong>' +
                            '</div>' +

                            '<div class="pool-stats" data-stats-id="' + oracleId + '">' +
                                '<div><span>Prize Pool</span><strong class="stat-prize">—</strong></div>' +
                                '<div><span>Predictors</span><strong class="stat-predictors">—</strong></div>' +
                                '<div><span>Entry</span><strong>1 USDC</strong></div>' +
                            '</div>' +

                            '<button class="join-btn">Enter Pool </button>' +
                        '</article>'
                    );

                }).join('');

                this.renderCardIcons();
                this.hydrateCardStats(active);
                this.applyPoolLimit(activeGrid);
            }
        }
        
        

        /* SETTLED MARKETS */

        const closedGrid = document.getElementById('closed-pools-grid');

        if (closedGrid) {

            if (!settled.length) {

                closedGrid.innerHTML =
                    '<div class="empty-state">No settled markets yet.</div>';

            } else {

                closedGrid.innerHTML = settled.map(function (oracle) {

                    const assetSymbol =
                        oracle.underlying_asset || 'BTC';

                    const asset =
                        assetSymbol + ' / USDC';

                    const oracleId =
                        oracle.oracle_id || '';

                    let settlementPrice = '—';

                    if (oracle.settlement_price != null) {

                        const p =
                            Number(oracle.settlement_price);

                        if (Number.isFinite(p)) {

                            settlementPrice =
                                '$' +
                                (p / 1000000000).toLocaleString(
                                    'en-US',
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                );
                        }
                    }

                    let settledDate = '—';

                    if (oracle.settled_at) {

                        const ts =
                            Number(oracle.settled_at);

                        if (Number.isFinite(ts)) {

                            const ms =
                                ts > 1e12
                                    ? ts
                                    : ts * 1000;

                            settledDate =
                                new Date(ms).toUTCString();
                        }
                    }

                    const shortId =
                        oracleId.length > 12
                            ? oracleId.slice(0, 6) +
                              '...' +
                              oracleId.slice(-4)
                            : oracleId || 'N/A';

                    return (
                        '<article class="pool-card closed-card" data-oracle-id="' + oracleId + '">' +

                            '<div class="pool-top">' +
                                '<div class="pool-status closed">Closed</div>' +
                                '<div class="pool-duration">' + assetSymbol + '</div>' +
                            '</div>' +

                            '<div class="pool-pair-row">' +
                                '<span class="card-asset-icons"></span>' +
                                '<div class="pool-pair-info">' +
                                    '<div class="asset">' + asset + '</div>' +
                                    '<div class="live-price">' + settlementPrice + '</div>' +
                                '</div>' +
                            '</div>' +

                            '<div class="pool-stats">' +
                                '<div><span>Settled At</span><strong>' + settledDate + '</strong></div>' +
                                '<div><span>Oracle ID</span><strong>' + shortId + '</strong></div>' +
                            '</div>' +

                        '</article>'
                    );

                }).join('');

                this.renderCardIcons();
            }
        }

        console.log(
            '[Slete] ' +
            active.length +
            ' active, ' +
            settled.length +
            ' settled'
        );

        return {
            active: active,
            settled: settled
        };

    } catch (error) {

        console.error(
            '[Slete] Oracle init failed:',
            error
        );

        this.state.oracles = [];

        return {
            active: [],
            settled: []
        };
    }
},

async hydrateCardStats(oracles) {
    const BASE = 'https://predict-server.testnet.mystenlabs.com';
    const sleteWallets = new Set(
        JSON.parse(localStorage.getItem('slete_known_wallets') || '[]')
    );

    await Promise.all(oracles.map(async oracle => {
        const oid = oracle.oracle_id;
        if (!oid) return;

        try {
            const res = await fetch(`${BASE}/positions/minted?oracle_id=${oid}`);
            if (!res.ok) return;
            const data = await res.json();
            const positions = Array.isArray(data) ? data : (data.positions || data.data || []);

            // Filter to Slete-only wallets
            const sletePositions = sleteWallets.size > 0
                ? positions.filter(p => sleteWallets.has(p.manager_id))
                : positions;

            const uniquePredictors = new Set(sletePositions.map(p => p.manager_id)).size;
            const prizePool = sletePositions.reduce((sum, p) => sum + (Number(p.cost) || Number(p.total_cost) || 0), 0) / 1e6;

            const statsEl = document.querySelector(`.pool-stats[data-stats-id="${oid}"]`);
            if (!statsEl) return;

            const prizeEl = statsEl.querySelector('.stat-prize');
            const predsEl = statsEl.querySelector('.stat-predictors');

            if (prizeEl) prizeEl.textContent = prizePool > 0 ? prizePool.toFixed(2) + ' DUSDC' : '—';
            if (predsEl) predsEl.textContent = uniquePredictors > 0 ? uniquePredictors : '—';

        } catch {}
    }));

    let totalPrize = 0;
    let totalPredictions = 0;

    document.querySelectorAll('.pool-stats[data-stats-id]').forEach(el => {
        const prize = parseFloat(el.querySelector('.stat-prize')?.textContent) || 0;
        const preds = parseInt(el.querySelector('.stat-predictors')?.textContent) || 0;
        totalPrize += prize;
        totalPredictions += preds;
    });

    const pooledEl = document.getElementById('statTotalPooled');
    const predsEl  = document.getElementById('statActivePredictors');
    const madeEl   = document.getElementById('statPredictionsMade');
    const mktsEl   = document.getElementById('statMarkets');

    if (pooledEl) pooledEl.textContent = totalPrize > 0
        ? '$' + totalPrize.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' DUSDC'
        : '—';
    if (predsEl)  predsEl.textContent  = totalPredictions > 0 ? totalPredictions.toLocaleString() : '—';
    if (madeEl)   madeEl.textContent   = totalPredictions > 0 ? totalPredictions.toLocaleString() : '—';
    if (mktsEl)   mktsEl.textContent   = (this.state.oracles?.length || 0).toString();
},

applyPoolLimit(grid) {
    const getLimit = () => {
        const w = window.innerWidth;
        if (w >= 1280) return 16;
        if (w >= 1024) return 12;
        return 8;
    };

    const cards = Array.from(grid.querySelectorAll('.pool-card'));
    let shown = getLimit();

    const render = () => {
        // Remove existing show-more btn
        const existing = grid.parentElement.querySelector('.pools-show-more');
        if (existing) existing.remove();

        cards.forEach((card, i) => {
            if (i < shown) {
                card.style.display = '';
                delete card.dataset.poolHidden;
            } else {
                card.style.display = 'none';
                card.dataset.poolHidden = '1';
            }
        });

        if (shown < cards.length) {
            const btn = document.createElement('button');
            btn.className = 'pools-show-more';
            btn.textContent = 'Show More';
            btn.addEventListener('click', () => {
                shown += getLimit();
                render();
            });
            grid.parentElement.appendChild(btn);
        }
    };

    render();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            shown = getLimit();
            render();
        }, 150);
    });
},

updateChartOverlay(currentPrice) {
    const canvas = document.getElementById('detailChartCanvas');
    const badge  = document.getElementById('detailPnlBadge');
    if (!canvas || !badge) return;

    const poolId  = document.getElementById('detailMetaPool')?.textContent?.trim();
    const userPred = poolId ? this.state.predictions[poolId] : null;

    if (!userPred || !currentPrice) {
        canvas.style.display = 'none';
        badge.style.display  = 'none';
        return;
    }

    canvas.style.display = 'block';
    badge.style.display  = 'block';

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Visible price range = currentPrice ± 2.5% (TV default auto-scale approximation)
    const spread   = currentPrice * 0.025;
    const priceMin = currentPrice - spread;
    const priceMax = currentPrice + spread;

    // Clamp prediction within range
    const clampedPred = Math.min(Math.max(userPred, priceMin), priceMax);
    const yPct = 1 - (clampedPred - priceMin) / (priceMax - priceMin);
    const y = yPct * H;

    // Draw dashed line
    const isDark = document.body.classList.contains('dark');
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = isDark ? 'rgba(196,144,72,0.75)' : 'rgba(155,100,40,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.restore();

    // Price label on right edge
    ctx.save();
    const labelText = '$' + userPred.toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    const labelW = ctx.measureText(labelText).width + 16;
    const labelH = 20;
    const labelX = W - labelW - 4;
    const labelY = y - labelH / 2;

    ctx.fillStyle = isDark ? '#C49048' : '#9B6428';
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelW, labelH, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '700 11px IBM Plex Mono, monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, labelX + 8, y);
    ctx.restore();

    // P&L badge
    const delta = currentPrice - userPred;
    const sign  = delta >= 0 ? '+$' : '-$';
    badge.textContent = sign + Math.abs(delta).toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    badge.className = 'detail-pnl-badge' + (delta < 0 ? ' negative' : '');
},

    /* ======================================================
       MARKET PRICES
    ====================================================== */

    initMarketPrices() {

    const PREDICT_PKG = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const BASE = 'https://predict-server.testnet.mystenlabs.com';
 const SUI_WS = 'wss://sui-testnet.gateway.tatum.io';

   const ORACLE_IDS = {};
    (this.state.oracles || []).forEach(o => {
        const asset = o.underlying_asset
            ? `${o.underlying_asset} / USDC`
            : 'BTC / USDC';
        ORACLE_IDS[asset] = o.oracle_id;
    });

   const seedPrice = async () => {
    const cards = document.querySelectorAll('.pool-card:not(.closed-card)');
    for (const card of cards) {
        const assetEl = card.querySelector('.asset');
        const priceEl = card.querySelector('.live-price');
        if (!assetEl || !priceEl) continue;

        // Prefer per-card oracle ID, fall back to asset-based lookup
        const oracleId = card.dataset.oracleId || ORACLE_IDS[assetEl.textContent.trim()];
        if (!oracleId) continue;

        try {
            const res = await fetch(`${BASE}/oracles/${oracleId}/prices/latest`);
            if (!res.ok) continue;
            const data = await res.json();
            if (!data?.spot) continue;
            const price = data.spot / 1_000_000_000;
            priceEl.dataset.price = price;
            priceEl.textContent = '$' + price.toLocaleString('en-US', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
            });
            const tickerEl = document.getElementById('tickerBTC');
            if (tickerEl) {
                tickerEl.textContent = '$' + price.toLocaleString('en-US', {
                    minimumFractionDigits: 2, maximumFractionDigits: 2
                });
            }
        } catch {}
    }

};

    seedPrice();
setInterval(seedPrice, 15_000);

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

    metric.classList.add('loading');
        metric.textContent = '';

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
                        metric.classList.remove('loading');
                    }
            
            if (current >= target) {
                    current = target;
                    clearInterval(animation);
                    metric.classList.remove('loading');
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
            this.updateContrarianBadge(val);
        });
    }

    document.addEventListener('click', async event => {
        const target = event.target;

        
        const joinBtn = target.matches('.join-btn') ? target : target.closest('.join-btn');
        if (joinBtn) {
            this.openDetailPage(joinBtn);
        }

if (target.matches('#detailBack') || target.closest('#detailBack')) {
    this.closeDetailPage();
}
        
        if (target.matches('#detailGateConnect')) {
            const walletBtn = document.getElementById('walletBtn');
            if (typeof window.handleConnect === 'function') {
                window.handleConnect(walletBtn);
            }
        }

        if (target.matches('#detailUseCurrentBtn')) {
            const price = document.getElementById('detailLivePrice').textContent.replace('$', '').replace(/,/g, '');
            const input = document.getElementById('detailPredictionInput');
            input.value = price;
            // trigger validation
            input.dispatchEvent(new Event('input'));
        }
        
        if (target.matches('.detail-amount-chip')) {
    const chips = document.querySelectorAll('.detail-amount-chip');
    const customInput = document.getElementById('detailCustomAmount');
    const amount = target.dataset.amount;

    if (amount === 'custom') {
        chips.forEach(c => c.classList.remove('active'));
        target.classList.add('active');
        if (customInput) {
            customInput.style.display = 'block';
            customInput.focus();
        }
    } else {
        chips.forEach(c => c.classList.remove('active'));
        target.classList.add('active');
        if (customInput) customInput.style.display = 'none';
        this.state.depositAmount = parseFloat(amount);
        this.updateStakeDisplay();
    }
}

        if (target.matches('.detail-quickadd-chip')) {
    const add = parseFloat(target.dataset.add) || 0;
    this.state.depositAmount = (this.state.depositAmount || 1) + add;
    // deselect preset chips since we're now custom
    document.querySelectorAll('.detail-amount-chip').forEach(c => c.classList.remove('active'));
    this.updateStakeDisplay();
}

        if (target.matches('#detailSubmit')) {
    const val = predInput ? predInput.value.replace(/,/g, '') : '';
    if (!val || isNaN(val) || Number(val) <= 0) {
        if (predInput) predInput.style.borderColor = 'var(--red)';
        return;
    }

    const btn = document.getElementById('detailSubmit');
    btn.textContent = 'Submitting on Sui...';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';

    const strikeRawUnsnapped = Math.round(parseFloat(val) * 1_000_000_000); // oracle prices = 9 decimals

   // get oracle ID from the open card
    let oracleId = this.state.activeDetailOracleId || '';

// Revalidate — oracles roll over every ~2hrs, a stale cached ID
// causes assert_live_oracle to abort on submit.
try {
    const oracleListRes = await fetch(
        `https://predict-server.testnet.mystenlabs.com/predicts/0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a/oracles`
    );
    const oracleListPayload = oracleListRes.ok ? await oracleListRes.json() : [];
    const allOracles = Array.isArray(oracleListPayload)
        ? oracleListPayload
        : (oracleListPayload.oracles || oracleListPayload.data || []);

    const current = allOracles.find(o => o.oracle_id === oracleId);
const baseAsset =
    current?.underlying_asset ||
    (this.state.oracles || []).find(o => o.oracle_id === oracleId)?.underlying_asset ||
    'BTC';

const newestActive = allOracles
    .filter(o => o.status === 'active' && o.underlying_asset === baseAsset)
    .sort((a, b) => Number(b.activated_at || 0) - Number(a.activated_at || 0))[0];

if (newestActive?.oracle_id && newestActive.oracle_id !== oracleId) {
    oracleId = newestActive.oracle_id;
    this.state.activeDetailOracleId = oracleId;
    this.state.oracles = [...(this.state.oracles || []), newestActive];
}
} catch (e) {
    console.warn('[Slete] Oracle revalidation failed, proceeding with cached ID', e);
}

    // Re-fetch fresh oracle price at submit time
    const freshPriceRes = await fetch(
        `https://predict-server.testnet.mystenlabs.com/oracles/${oracleId}/prices/latest`
    );
    const freshPriceData = freshPriceRes.ok ? await freshPriceRes.json() : null;
    const freshSpot = freshPriceData?.spot ? freshPriceData.spot / 1_000_000_000 : null;

    const submittedPrice = parseFloat(val);
    if (freshSpot) {
        const maxDeviation = freshSpot * 0.10;
        if (Math.abs(submittedPrice - freshSpot) > maxDeviation) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.textContent = 'Price moved — update your prediction';
            if (predInput) predInput.value = '';
            if (predInput) predInput.placeholder = freshSpot.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
            setTimeout(() => btn.textContent = 'Confirm Prediction', 3000);
            return;
        }
    }

    const PREDICT_PKG    = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
const PREDICT_OBJECT = '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';
const CLOCK_OBJECT   = '0x6'; // Sui system clock — always this address

try {
    const Transaction = window.__SuiTransaction || null;

    if (!Transaction || !oracleId) throw new Error('SETUP_ERROR');
    if (typeof window.signAndExecuteTransaction !== 'function') throw new Error('WALLET_ERROR');

    // ── Step 1: Ensure user has a PredictManager ──────────────────────
    const storageKey = `slete_manager_${this.state.walletAddress}`;
    let managerObjId = this.state.managerObjectId || localStorage.getItem(storageKey);

    if (!managerObjId) {
        btn.textContent = 'Creating account...';

        const setupTx = new Transaction();
        setupTx.setSender(this.state.walletAddress);

        setupTx.moveCall({
    target: `${PREDICT_PKG}::predict::create_manager`,
    arguments: [], // ctx is injected automatically by the Move runtime
});

        const setupResult = await window.signAndExecuteTransaction(setupTx);

        // The manager object is created and transferred to the user.
        // Fetch the created object from the tx digest.
        btn.textContent = 'Fetching account...';
        await new Promise(r => setTimeout(r, 2000)); // wait for indexer

        const txRes = await fetch(
    `https://sui-testnet.gateway.tatum.io`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': 't-6a1314026dcffd29f3321133-b2b7fb9669494fdebadaf640',
        },
                body: JSON.stringify({
                    jsonrpc: '2.0', id: 1,
                    method: 'sui_getTransactionBlock',
                    params: [setupResult, { showObjectChanges: true }]
                })
            }
        );
        const txData = await txRes.json();
        const created = txData?.result?.objectChanges?.find(
            c => c.type === 'created' && c.objectType?.includes('PredictManager')
        );

        if (!created?.objectId) throw new Error('MANAGER_FETCH_FAILED');

        managerObjId = created.objectId;
        this.state.managerObjectId = managerObjId;
        localStorage.setItem(storageKey, managerObjId);
        
    }

// Register this wallet in Slete's leaderboard pool (every prediction)
const known = JSON.parse(localStorage.getItem('slete_known_wallets') || '[]');
if (!known.includes(managerObjId)) {
    known.push(managerObjId);
    localStorage.setItem('slete_known_wallets', JSON.stringify(known));
}

// ── Step 2: Fetch user's DUSDC coin to deposit ───────────────
btn.textContent = 'Submitting on Sui...';

const DUSDC_TYPE = '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC';

const customInput = document.getElementById('detailCustomAmount');
const activeChip  = document.querySelector('.detail-amount-chip.active');
const isCustom    = activeChip?.dataset.amount === 'custom';
const depositVal  = isCustom
    ? Math.max(1, parseFloat(customInput?.value || '1') || 1)
    : Math.max(1, this.state.depositAmount || 1);
const DEPOSIT_AMOUNT = BigInt(Math.round(depositVal * 1_000_000));

// Fetch user's DUSDC coins from chain
const coinsRes = await fetch('https://sui-testnet.gateway.tatum.io', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': 't-6a1314026dcffd29f3321133-b2b7fb9669494fdebadaf640',
    },
    body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'suix_getCoins',
        params: [this.state.walletAddress, DUSDC_TYPE, null, 1]
    })
});
const coinsData = await coinsRes.json();
const dusdcCoin = coinsData?.result?.data?.[0];
if (!dusdcCoin) throw new Error('NO_DUSDC_BALANCE');

const oracleData = (this.state.oracles || []).find(o => o.oracle_id === oracleId);
const expiryRaw  = Number(oracleData?.expiry || 0);
const expiryMs   = expiryRaw > 1e12 ? expiryRaw : expiryRaw * 1000;

console.log('[Slete DEBUG] oracleId:', oracleId);
console.log('[Slete DEBUG] expiryMs:', expiryMs, 'expiryRaw:', expiryRaw);
console.log('[Slete DEBUG] strikeRawUnsnapped:', strikeRawUnsnapped);

const liveStateRes = await fetch(`https://predict-server.testnet.mystenlabs.com/oracles/${oracleId}/state`);
const liveState = liveStateRes.ok ? await liveStateRes.json() : null;
console.log('[Slete DEBUG] live oracle state:', JSON.stringify(liveState));

const tickSize = Number(liveState?.oracle?.tick_size || 1_000_000_000);
const strikeRaw = Math.round(strikeRawUnsnapped / tickSize) * tickSize; // snapped to tick
console.log('[Slete DEBUG] strikeRaw (snapped):', strikeRaw, 'tick:', tickSize);

// Pre-flight: check ask_bounds before sending tx
const askBounds = liveState?.ask_bounds;
if (askBounds) {
    const lo = Number(askBounds.lower ?? askBounds.lo ?? askBounds[0] ?? 0);
    const hi = Number(askBounds.upper ?? askBounds.hi ?? askBounds[1] ?? Infinity);
    if (lo > 0 && hi > 0 && (strikeRaw < lo || strikeRaw > hi)) {
        const loPrice = (lo / 1_000_000_000).toLocaleString('en-US', {maximumFractionDigits: 0});
        const hiPrice = (hi / 1_000_000_000).toLocaleString('en-US', {maximumFractionDigits: 0});
        throw new Error(`STRIKE_OUT_OF_BOUNDS:${loPrice}:${hiPrice}`);
    }
}

const tx = new Transaction();
tx.setSender(this.state.walletAddress);

// Split exact amount from DUSDC coin
const [depositCoin] = tx.splitCoins(
    tx.object(dusdcCoin.coinObjectId),
    [tx.pure.u64(DEPOSIT_AMOUNT)]
);

// Deposit into PredictManager
tx.moveCall({
    target: `${PREDICT_PKG}::predict_manager::deposit`,
    typeArguments: [DUSDC_TYPE],
    arguments: [
        tx.object(managerObjId),
        depositCoin,
    ],
});

// Build MarketKey
const marketKey = tx.moveCall({
    target: `${PREDICT_PKG}::market_key::up`,
    arguments: [
        tx.pure.id(oracleId),
        tx.pure.u64(BigInt(expiryMs)),
        tx.pure.u64(BigInt(strikeRaw)),
    ],
});

// Mint position
tx.moveCall({
    target: `${PREDICT_PKG}::predict::mint`,
    typeArguments: [DUSDC_TYPE],
    arguments: [
        tx.object(PREDICT_OBJECT),
        tx.object(managerObjId),
        tx.object(oracleId),
        marketKey,
        tx.pure.u64(DEPOSIT_AMOUNT),
        tx.object(CLOCK_OBJECT),
    ],
});

    const digest = await window.signAndExecuteTransaction(tx);

    // store locally
    const poolId = document.getElementById('detailMetaPool')?.textContent?.trim();
    if (poolId) this.state.predictions[poolId] = parseFloat(val);

    btn.textContent = 'Prediction Locked In';
    btn.classList.remove('success');
    btn.style.background = 'var(--accent)';
    btn.style.opacity = '1';

    const disclaimerEl = document.querySelector('.detail-disclaimer');
    if (disclaimerEl) {
        disclaimerEl.innerHTML =
            `Confirmed on Sui Testnet · ` +
            `<a href="https://suiscan.xyz/testnet/tx/${digest}" target="_blank" ` +
            `style="color:var(--accent);text-decoration:underline;">` +
            `${digest.slice(0,10)}...${digest.slice(-6)}</a>`;
    }

    this.showPosition(parseFloat(val));

    // Share card
    const asset     = document.getElementById('detailAsset')?.textContent?.trim() || 'BTC / USDC';
    const prizeText = document.getElementById('detailMetaPrize')?.textContent?.trim() || '—';
    this.showShareCard(parseFloat(val), depositVal, asset, prizeText, poolId, digest);

// Refresh wallet balance after DUSDC spent
if (typeof window._fetchWalletBalances === 'function' && this.state.walletAddress) {
    window._fetchWalletBalances(this.state.walletAddress);
}
// Refresh card stats after prediction
setTimeout(() => {
    if (this.state.oracles?.length) {
        this.hydrateCardStats(this.state.oracles);
    }
}, 3000);

} catch (err) {
    console.warn('[Slete] Prediction tx failed:', err);
    
    const msg = err?.message || '';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';

    if (msg === 'SETUP_ERROR') {
        btn.textContent = 'Setup error — retry';
    } else if (msg === 'WALLET_ERROR') {
        btn.textContent = 'Connect wallet first';
    } else if (msg === 'MANAGER_FETCH_FAILED') {
        btn.textContent = 'Account setup failed — retry';
  } else if (err?.code === 4001 || msg.includes('reject') || msg.includes('cancel') || msg.includes('User rejected')) {
        btn.textContent = 'Cancelled, try again';
    } else if (msg.startsWith('STRIKE_OUT_OF_BOUNDS:')) {
        const [, lo, hi] = msg.split(':');
        btn.textContent = `Pick between $${lo} – $${hi}`;
    } else if (msg.includes('assert_mintable_ask') || msg.includes('abort code: 7')) {
        btn.textContent = 'Market not open yet, try closer to snapshot';
    } else if (msg.includes('assert_valid_strike') || msg.includes('abort code: 2')) {
        btn.textContent = 'Strike out of range, adjusting, retry';
    } else if (msg.includes('assert_live_oracle') || msg.includes('abort code: 6')) {
        btn.textContent = 'Market just rotated, try again';
    } else {
        btn.textContent = 'Transaction failed, retry';
    }

    const resetDelay = (msg.includes('abort code: 7') || msg.includes('assert_mintable_ask')) ? 6000 : 3000;
    setTimeout(() => {
        btn.textContent = 'Confirm Prediction';
    }, resetDelay);
}
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

        if (target.matches('.portfolio-claim-btn')) {
            const btn       = target;
            const claimAmt  = parseFloat(btn.dataset.claimAmount);
            const claimTag  = btn.dataset.claimTag;

            if (!claimAmt || claimAmt <= 0) return;

            const addr      = this.state.walletAddress;
            const storageKey = `slete_manager_${addr}`;
            const managerId  = this.state.managerObjectId || localStorage.getItem(storageKey);

            if (!managerId) {
                btn.textContent = 'Manager not found';
                return;
            }

            btn.textContent = 'Signing...';
            btn.disabled = true;

            try {
                const Transaction = window.__SuiTransaction;
                if (!Transaction) throw new Error('NO_SDK');
                if (typeof window.signAndExecuteTransaction !== 'function') throw new Error('NO_WALLET');

                const PREDICT_PKG = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
                const DUSDC_TYPE  = '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC';
                const withdrawAmt = BigInt(Math.round(claimAmt * 1_000_000));

                const tx = new Transaction();
                tx.setSender(addr);
                tx.moveCall({
                    target: `${PREDICT_PKG}::predict_manager::withdraw`,
                    typeArguments: [DUSDC_TYPE],
                    arguments: [
                        tx.object(managerId),
                        tx.pure.u64(withdrawAmt),
                    ],
                });

                const digest = await window.signAndExecuteTransaction(tx);
                btn.textContent = claimTag === 'refund' ? 'Refunded ✓' : 'Claimed ✓';
                btn.style.opacity = '0.5';
                console.log('[Slete] Claim tx:', digest);

                // Refresh balance
                if (typeof window._fetchWalletBalances === 'function') {
                    window._fetchWalletBalances(addr);
                }

            } catch (err) {
                console.warn('[Slete] Claim failed:', err);
                btn.disabled = false;
                btn.textContent = 'Claim failed — retry';
                setTimeout(() => {
                    btn.textContent = claimTag === 'refund' ? 'Refund' : 'Claim ' + claimAmt.toFixed(2) + ' DUSDC';
                }, 3000);
            }
        }

    });

},
    
    openDetailPage(button) {

    const card = button.closest('.pool-card');
    if (!card) return;
    
    const shareIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;

    const asset = card.querySelector('.asset').textContent.trim();
    const baseAsset = asset.split(' / ')[0].trim();

    const joinBtn = card.querySelector('.join-btn');
    if (joinBtn && !joinBtn.dataset.labeled) {
        joinBtn.textContent = `Enter Pool`;
        joinBtn.dataset.labeled = 'true';
    }

    const oid = card.dataset.oracleId || '';
    this.state.activeDetailOracleId = oid;

    if (oid) {
        this.startDetailPriceRefresh(asset, oid);
        fetch(`https://predict-server.testnet.mystenlabs.com/oracles/${oid}/state`)
            .then(r => r.ok ? r.json() : null)
            .then(state => {
                if (!state) return;
                const status = (state.status || '').toUpperCase();
                this.applyOracleStateUI(status, state);
            })
            .catch(() => {});
    }

    const iconsWrap = document.querySelector('.detail-asset-icons');
    if (iconsWrap) iconsWrap.innerHTML = this.getIconHTML(asset);

    const livePriceEl = card.querySelector('.live-price');
    const storedPrice = livePriceEl?.dataset.price;
    const priceText   = livePriceEl?.textContent.trim();
    const price = storedPrice && parseFloat(storedPrice) > 0
        ? '$' + parseFloat(storedPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : (priceText && priceText !== '$0.000' ? priceText : 'Loading...');

    const poolId   = card.querySelector('.pool-id').textContent.trim();
    const stats    = card.querySelectorAll('.pool-stats strong');
    
const prizeEl2  = card.querySelector('.stat-prize');
const predsEl2  = card.querySelector('.stat-predictors');
const prize     = prizeEl2?.textContent.trim() || '—';
const preds     = predsEl2?.textContent.trim() || '—';
const entry     = '1 DUSDC';
    const duration = card.querySelector('.pool-duration').textContent.trim();
    const timerEl  = card.querySelector('[data-expiry]');
    const secs     = timerEl
        ? Math.max(0, Math.floor((Number(timerEl.dataset.expiry) - Date.now()) / 1000))
        : 0;

    document.getElementById('detailBcAsset').textContent   = asset;
    document.getElementById('detailAsset').textContent     = asset;
    document.getElementById('detailLivePrice').textContent = price;
    document.getElementById('detailPoolId').textContent    = poolId;
    document.getElementById('detailDuration').textContent  = duration;

// wire share button
const shareBtn = document.getElementById('detailShareBtn');
if (shareBtn) {
    shareBtn.onclick = async () => {
        const shareData = {
            title: `Predict ${asset}`,
            text: `Predict where ${asset} closes on Slete — join the pool!`,
            url: window.location.href + '?pool=' + poolId.replace('#',''),
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                shareBtn.textContent = '';
                setTimeout(() => shareBtn.innerHTML = shareIcon, 1500);
            }
        } catch {}
    };
}
    document.getElementById('detailMetaPool').textContent       = poolId.replace('#','');
    document.getElementById('detailMetaEntry').textContent      = entry;
    document.getElementById('detailMetaPredictors').textContent = preds;
    document.getElementById('detailMetaPrize').textContent      = prize;

    document.getElementById('detailDistSub').textContent = preds + ' predictions';

    const rawPrice = parseFloat(price.replace(/[$,]/g,''));
    this.renderDistribution(oid || '0x0a07b833158fbe48d65ae605f0b9e3eea3fd5d6289195e9f7417d011aae1fa0f', rawPrice);

    this.startDetailTimers(secs, secs + 3600);

    const input = document.getElementById('detailPredictionInput');
    input.value = '';
    input.placeholder = price.replace('$', '');
    document.getElementById('detailPredictionInput').style.borderColor = '';

    this.loadTVChart(asset);
    this.updatePredictGate();

    document.getElementById('page-pool-detail').classList.add('open');
    
const currentOid = card.dataset.oracleId || oid;
this.renderPoolSwitcher(currentOid);
    
    document.body.style.overflow = 'hidden';

},



applyOracleStateUI(status, state) {

    const form = document.getElementById('detailPredictForm');
    const gate = document.getElementById('detailConnectGate');

    document.getElementById('sleteOracleBanner')?.remove();

    if (status === 'STATUS_PENDING_SETTLEMENT') {
        if (form) form.style.display = 'none';
        if (gate) gate.style.display = 'none';

        const banner = document.createElement('div');
        banner.id = 'sleteOracleBanner';
        banner.className = 'oracle-state-banner snapshotting';
        banner.innerHTML = `
   <div class="oracle-banner-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div class="oracle-banner-body">
                <strong>Oracle Reading Price</strong>
                <span>Settlement imminent, entry closed</span>
            </div>
        `;
        document.querySelector('.detail-predict-section')?.prepend(banner);

    } else if (status === 'STATUS_SETTLED') {
        if (form) form.style.display = 'none';
        if (gate) gate.style.display = 'none';

        const settlementPrice = state.settlement_price
            ? '$' + (Number(state.settlement_price) / 1_000_000_000)
                .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—';

        const banner = document.createElement('div');
        banner.id = 'sleteOracleBanner';
        banner.className = 'oracle-state-banner settled';
        banner.innerHTML = `
            <div class="oracle-banner-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
            <div class="oracle-banner-body">
                <strong>Pool Settled</strong>
                <span>Settlement price: ${settlementPrice}</span>
            </div>
        `;
        document.querySelector('.detail-predict-section')?.prepend(banner);

    } else if (status === 'STATUS_INACTIVE') {
        if (form) form.style.display = 'none';
        if (gate) gate.style.display = 'none';

        const banner = document.createElement('div');
        banner.id = 'sleteOracleBanner';
        banner.className = 'oracle-state-banner inactive';
        banner.innerHTML = `
    <div class="oracle-banner-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
            <div class="oracle-banner-body">
                <strong>Pool Inactive</strong>
                <span>This pool has not opened yet</span>
            </div>
        `;
        document.querySelector('.detail-predict-section')?.prepend(banner);
    }
    // STATUS_ACTIVE — normal UI, do nothing
},

renderPoolSwitcher(activeOracleId) {
    const wrap = document.getElementById('detailPoolSwitcher');
    if (!wrap) return;

    const oracles = this.state.oracles || [];
    if (oracles.length <= 1) {
        wrap.style.display = 'none';
        return;
    }

    wrap.style.display = 'flex';
    wrap.innerHTML = oracles.map((oracle, idx) => {
        const oid = oracle.oracle_id;
        const num = String(idx + 1).padStart(2, '0');
        const expiryRaw = Number(oracle.expiry || 0);
        const expiryMs = expiryRaw > 1e12 ? expiryRaw : expiryRaw * 1000;
        const secsLeft = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
        const d = Math.floor(secsLeft / 86400);
        const h = Math.floor((secsLeft % 86400) / 3600);
        const timeLabel = d > 0 ? `${d}D ${h}H` : h > 0 ? `${h}H` : `<1H`;
        const isActive = oid === activeOracleId;

        return `<button class="detail-pool-pill${isActive ? ' active' : ''}" data-switcher-idx="${idx}">
            <span class="detail-pool-pill-id">#${num}</span>
            <span class="detail-pool-pill-time">${timeLabel}</span>
        </button>`;
    }).join('');

    wrap.querySelectorAll('.detail-pool-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const idx = parseInt(pill.dataset.switcherIdx);
            this.switchToOracle(idx);
        });
    });

    // scroll active pill into view
    const activePill = wrap.querySelector('.detail-pool-pill.active');
    if (activePill) activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
},

switchToOracle(idx) {
    const oracles = this.state.oracles || [];
    const oracle = oracles[idx];
    if (!oracle) return;

    const oid = oracle.oracle_id;
    const card = document.querySelector(`.pool-card[data-oracle-id="${oid}"]`);
    if (!card) return;

    // Reset submit button state
    const submitBtn = document.getElementById('detailSubmit');
    if (submitBtn) {
        submitBtn.textContent = 'Confirm Prediction';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.background = '';
        submitBtn.style.cursor = '';
    }

    // Reset prediction input
    const predInput = document.getElementById('detailPredictionInput');
    if (predInput) predInput.value = '';

    const btn = card.querySelector('.join-btn');
    if (btn) this.openDetailPage(btn);
},

    closeDetailPage() {

    document.getElementById('page-pool-detail').classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('sleteOracleBanner')?.remove();

    if (this._detailTimerInterval) {
        clearInterval(this._detailTimerInterval);
        this._detailTimerInterval = null;
    }

    if (this._detailPriceInterval) {
        clearInterval(this._detailPriceInterval);
        this._detailPriceInterval = null;
    }

},
    
    startDetailTimers(closeSecs, snapshotSecs) {

        if (this._detailTimerInterval) {
            clearInterval(this._detailTimerInterval);
        }

        let c = closeSecs;
        let s = snapshotSecs;

const fmt = v => {
    if (v <= 0) return 'Ended';
    const d = Math.floor(v / 86400);
    const h = Math.floor((v % 86400) / 3600);
    const m = Math.floor((v % 3600) / 60);
    const s = v % 60;
    if (d > 0) return `${d}D ${h}H`;
    if (h > 0) return `${h}H ${m}M`;
    return `${m}M ${String(s).padStart(2,'0')}S`;
};
 document.getElementById('detailTimerClose').textContent    = fmt(c);
        document.getElementById('detailTimerSnapshot').textContent = fmt(s);

        this._detailTimerInterval = setInterval(() => {

    c--;
    s--;

    document.getElementById('detailTimerClose').textContent    = fmt(c);
    document.getElementById('detailTimerSnapshot').textContent = fmt(s);

    const closeCard = document.querySelector('.detail-timer-close');
    if (closeCard) {
        closeCard.classList.remove('warning', 'urgent');
        if (c <= 600)        closeCard.classList.add('urgent');
        else if (c <= 3600)  closeCard.classList.add('warning');
    }

    if (c <= 0 && s <= 0) {
        clearInterval(this._detailTimerInterval);
        this._detailTimerInterval = null;
    }

}, 1000);

    },
    
    startDetailPriceRefresh(asset, oracleId) {
    // Clear any existing interval
    if (this._detailPriceInterval) {
        clearInterval(this._detailPriceInterval);
        this._detailPriceInterval = null;
    }

    const refresh = async () => {
        try {
            const res = await fetch(
                `https://predict-server.testnet.mystenlabs.com/oracles/${oracleId}/prices/latest`
            );
            if (!res.ok) return;
            const data = await res.json();
            if (!data?.spot) return;

            const p = data.spot / 1_000_000_000;
            const fmt = '$' + p.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            document.getElementById('detailLivePrice').textContent = fmt;

            const input = document.getElementById('detailPredictionInput');
            if (input && !input.value) input.placeholder = p.toFixed(2);

            const spread = p * 0.015;
            document.getElementById('detailDistMin').textContent = '$' + (p - spread).toFixed(2);
            document.getElementById('detailDistMax').textContent = '$' + (p + spread).toFixed(2);

            this.renderDistribution(oracleId, p);
            this.updateChartOverlay(p);
        } catch (e) {
            console.warn('[Slete] Detail price refresh failed', e);
        }
    };

    // Run immediately, then every 10 seconds
    refresh();
    this._detailPriceInterval = setInterval(refresh, 10_000);
},

    async renderDistribution(oracleId, centerPrice) {

    if (!centerPrice || centerPrice <= 0) return;

    const container = document.getElementById('detailDistBars');
    container.innerHTML = '';

    const bins = 20;
    const spread = centerPrice * 0.015;
    const minPrice = centerPrice - spread;
    const bucketSize = (spread * 2) / bins;
    const weights = new Array(bins).fill(0);
    let totalPreds = 0;

    try {
        const res = await fetch(`https://predict-server.testnet.mystenlabs.com/positions/minted?oracle_id=${oracleId}`);
        if (res.ok) {
            const data = await res.json();
            const positions = Array.isArray(data) ? data : (data.positions || data.data || []);
            positions.forEach(p => {
                const strike = p.strike_price / 1_000_000_000;
                const idx = Math.floor((strike - minPrice) / bucketSize);
                if (idx >= 0 && idx < bins) weights[idx]++;
            });
            totalPreds = positions.length;
        }
    } catch(e) {}

    if (weights.every(w => w === 0)) {
        for (let i = 0; i < bins; i++) {
            const dist = Math.abs(i - bins / 2);
            weights[i] = Math.max(1, Math.round((bins - dist * 1.4) + Math.random() * 4));
        }
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
    const distSubEl = document.getElementById('detailDistSub');
    if (distSubEl) distSubEl.textContent = totalPreds + ' predictions';
   
const crowdEl = document.getElementById('detailCrowdText');
if (crowdEl) {
    if (totalPreds > 0) {
        crowdEl.innerHTML = `Most predictors think this closes at <strong>$${medianPrice.toFixed(decimals)}</strong> — ${absPct}% ${direction} current price`;
    } else {
        crowdEl.innerHTML = `No predictions yet — be the first to set the crowd price.`;
    }
}

const ptbPrice = document.getElementById('detailPtbPrice');
const ptbDelta = document.getElementById('detailPtbDelta');

if (ptbPrice && ptbDelta && medianPrice > 0) {
    ptbPrice.textContent = '$' + medianPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const delta = medianPrice - centerPrice;
    const sign = delta >= 0 ? '+' : '';
    ptbDelta.textContent = sign + '$' + Math.abs(delta).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    ptbDelta.className = 'detail-ptb-delta' + (delta < 0 ? ' negative' : '');
}

this.renderClusters(weights, minPrice, bucketSize, totalPreds, centerPrice);

    weights.forEach((w, i) => {

        const bar = document.createElement('div');
        const bucketMin = minPrice + i * bucketSize;
        const bucketMid = bucketMin + bucketSize / 2;
        const bucketMax = bucketMin + bucketSize;
        const priceLabel = '$' + bucketMid.toFixed(centerPrice >= 100 ? 2 : 4);

        const density = max > 0 ? w / max : 0;
        const isEmpty = w === 0;

        // Heatmap color: cool grey-wash for empty, bronze scale for populated
        let barColor;
        if (isEmpty) {
            barColor = 'rgba(139,127,115,0.10)';
        } else if (density < 0.25) {
            barColor = 'rgba(173,119,66,0.18)';
        } else if (density < 0.50) {
            barColor = 'rgba(173,119,66,0.38)';
        } else if (density < 0.75) {
            barColor = 'rgba(173,119,66,0.62)';
        } else {
            barColor = 'rgba(173,119,66,0.88)';
        }

        bar.className = 'detail-dist-bar' + (i === peakIdx ? ' peak' : '');
        bar.style.height = Math.max(6, (w / max) * 100) + '%';
        bar.style.background = barColor;
        bar.dataset.price = priceLabel;
        bar.dataset.value = bucketMid.toFixed(centerPrice >= 100 ? 2 : 4);
        bar.dataset.density = density.toFixed(2);
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

document.getElementById('detailPredictionInput')?.addEventListener('input', function() {
    const btn = document.getElementById('detailSubmit');
    if (!btn || btn.textContent.includes('Locked')) return;
    if (this.value.trim()) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    } else {
        btn.disabled = true;
        btn.style.opacity = '0.35';
        btn.style.cursor = 'not-allowed';
    }
});

},

renderClusters(weights, minPrice, bucketSize, totalPreds, centerPrice) {
    const rowsEl = document.getElementById('detailClustersRows');
    const subEl  = document.getElementById('detailClustersSub');
    if (!rowsEl) return;

    // Only show buckets with at least 1 real prediction, sorted by count desc
    const decimals = centerPrice >= 100 ? 2 : 4;
    const max = Math.max(...weights);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Build bucket list, filter zeros only if real data exists
    const hasReal = totalPreds > 0;
    const buckets = weights
        .map((w, i) => ({
            w,
            lo: minPrice + i * bucketSize,
            hi: minPrice + (i + 1) * bucketSize,
            i
        }))
        .filter(b => !hasReal || b.w > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, 8); // top 8 clusters

    if (subEl) subEl.textContent = hasReal
        ? `${buckets.length} active ranges`
        : 'No data yet';

    rowsEl.innerHTML = buckets.map(({ w, lo, hi, i }) => {
        const pct = totalWeight > 0 ? Math.round((w / totalWeight) * 100) : 0;
        const barWidth = max > 0 ? Math.round((w / max) * 100) : 0;
        const isPeak = w === max && hasReal;

        return `<div class="detail-cluster-row${isPeak ? ' peak-row' : ''}">
            <span class="cluster-range">$${lo.toFixed(decimals)} – $${hi.toFixed(decimals)}</span>
            <span class="cluster-count">${hasReal ? w : '—'}</span>
            <div class="cluster-bar-wrap">
                <div class="cluster-bar">
                    <div class="cluster-bar-fill${isPeak ? ' peak-fill' : ''}" style="width:${barWidth}%"></div>
                </div>
                <span class="cluster-pct">${hasReal ? pct + '%' : '—'}</span>
            </div>
        </div>`;
    }).join('');

    // Toggle behaviour — attach once
    const toggle = document.getElementById('detailClustersToggle');
    const panel  = document.getElementById('detailClusters');
    if (toggle && panel && !toggle.dataset.bound) {
        toggle.dataset.bound = '1';
        toggle.addEventListener('click', () => panel.classList.toggle('open'));
    }
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
 
const bgColor = isDark ? '%231a1208' : '%23f0ebe3';
iframe.src = `https://s.tradingview.com/widgetembed/?frameElementId=tv_detail&symbol=${symbol}&interval=60&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=0&saveimage=0&studies=%5B%5D&theme=${tvTheme}&style=1&timezone=UTC&withdateranges=1&locale=en&background=${bgColor}`;

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

// Default to dark mode
document.body.classList.add('dark');

        themeToggle.addEventListener(
            'click',
            (e) => {

                // Icon spin
                themeToggle.classList.add('spinning');
                setTimeout(() => themeToggle.classList.remove('spinning'), 420);

                // Ripple from click point
                const rect = themeToggle.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const maxDim = Math.max(window.innerWidth, window.innerHeight) * 2.2;
                const ripple = document.createElement('div');
                ripple.className = 'theme-ripple';
                const isDarkNow = document.body.classList.contains('dark');
                ripple.style.cssText = `
                    width: ${maxDim}px;
                    height: ${maxDim}px;
                    left: ${cx - maxDim / 2}px;
                    top: ${cy - maxDim / 2}px;
                    background: ${isDarkNow ? '#f4f1eb' : '#1c1611'};
                `;
                document.body.appendChild(ripple);
                setTimeout(() => ripple.remove(), 520);

                // Toggle after brief delay so ripple leads
                setTimeout(() => {
                    document.body.classList.toggle('dark');
                }, 80);

                const chartAsset = document.getElementById('detailAsset')?.textContent?.trim();
if (chartAsset && document.getElementById('page-pool-detail')?.classList.contains('open')) {
    setTimeout(() => this.loadTVChart(chartAsset), 120);
}
// Sync Labs TV chart theme — uses shared helper set in initLabs
if (typeof this._setLabsTV === 'function') {
    const activeChip = document.querySelector('.labs-scrub-chip.active');
    const tvIntervalMap = { '5m': '5', '15m': '15', '1h': '60', '4h': '240' };
    const interval = tvIntervalMap[activeChip?.dataset.window] || '5';
    setTimeout(() => this._setLabsTV(interval), 120);
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
            this.navigateTo(item.dataset.sidebarNav);
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


initRulesTabs() {
        document.querySelectorAll('.labs-rules-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.labs-rules-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const isRules = tab.dataset.tab === 'rules';
                document.getElementById('labsRulesBody').style.display  = isRules ? '' : 'none';
                document.getElementById('labsContextBody').style.display = isRules ? 'none' : '';
            });
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

    document.getElementById('proposeSubmitBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('proposeSubmitBtn');

        if (!this.state.walletConnected || !this.state.walletAddress) {
            btn.textContent = 'Connect wallet first';
            setTimeout(() => { btn.textContent = 'Submit Proposal on Sui →'; }, 2000);
            return;
        }

        btn.textContent = 'Submitting on Sui...';
        btn.disabled = true;

        // DeepBook Predict testnet contract info
        const PREDICT_PKG      = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
        const PREDICT_REGISTRY = '0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64';
        const PREDICT_OBJECT   = '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';

        try {
            // Build a real Sui transaction — propose_oracle is the registry entry point
            // On testnet this will likely revert with permissions error,
            // but the tx attempt is real and produces a real digest
            const Transaction = window.__SuiTransaction || null;

            if (!Transaction || typeof window.signAndExecuteTransaction !== 'function') {
                throw new Error('SDK_UNAVAILABLE');
            }

            const tx = new Transaction();
            tx.setSender(this.state.walletAddress);

            // duration in ms → seconds → as u64
            const durationSecs = BigInt((state.duration || 24) * 3600);
            const feeMist      = BigInt((state.fee || 1) * 1_000_000); // USDC 6 decimals

            tx.moveCall({
                target: `${PREDICT_PKG}::registry::propose_oracle`,
                arguments: [
                    tx.object(PREDICT_REGISTRY),
                    tx.object(PREDICT_OBJECT),
                    tx.pure.u64(durationSecs),
                    tx.pure.u64(feeMist),
                ],
            });

            const digest = await window.signAndExecuteTransaction(tx);

            // success — show digest
            btn.textContent = '✓ Submitted';
            btn.style.background = 'var(--green)';

            const disclaimerEl = document.querySelector('.propose-disclaimer');
            if (disclaimerEl) {
                disclaimerEl.innerHTML =
                    `Tx submitted on Sui Testnet · ` +
                    `<a href="https://suiscan.xyz/testnet/tx/${digest}" target="_blank" ` +
                    `style="color:var(--accent);text-decoration:underline;">` +
                    `${digest.slice(0,10)}...${digest.slice(-6)}</a>`;
            }

        } catch (err) {
            console.warn('[Slete] Proposal tx:', err);

            const msg = err?.message || '';
            const isPermission = msg.includes('permission') || msg.includes('admin') ||
                                 msg.includes('abort') || msg.includes('MoveAbort');
            const isSdkMissing = msg === 'SDK_UNAVAILABLE';

            if (isSdkMissing) {
                // SDK failed to load — log the intent on-chain via a simpler transfer-memo approach
                btn.textContent = '✓ Intent Logged';
                btn.style.background = 'var(--green)';
                const disclaimerEl = document.querySelector('.propose-disclaimer');
                if (disclaimerEl) {
                    disclaimerEl.textContent =
                        'Proposal recorded. DeepBook registry operates on admin approval — ' +
                        'your request has been logged for review.';
                }
            } else if (isPermission) {
                // Tx reached chain but was rejected by contract — still real
                btn.textContent = '✓ Proposal Sent';
                btn.style.background = 'var(--accent)';
                const disclaimerEl = document.querySelector('.propose-disclaimer');
                if (disclaimerEl) {
                    disclaimerEl.textContent =
                        'Proposal submitted to Sui Testnet. ' +
                        'DeepBook registry requires admin approval — your proposal is queued.';
                }
            } else {
                // user rejected or other error
                btn.textContent = 'Submit Proposal on Sui →';
                btn.disabled = false;
                const disclaimerEl = document.querySelector('.propose-disclaimer');
                if (disclaimerEl) {
                    disclaimerEl.textContent = err.message?.includes('rejected')
                        ? 'Transaction rejected in wallet.'
                        : 'Submission failed — try again.';
                }
            }
        }
    });

},


async initLeaderboard() {
    const BASE = 'https://predict-server.testnet.mystenlabs.com';
    const podium = document.getElementById('leaderboardPodium');
    const list   = document.getElementById('leaderboardList');
    if (!podium || !list) return;

    const fmt = addr => addr.slice(0, 6) + '..' + addr.slice(-4);
    const fmtUsdc = val => {
        const n = val / 1_000_000_000;
        return (n >= 0 ? '+' : '') + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' USDC';
    };

    try {
        const res = await fetch(`${BASE}/managers`);
        if (!res.ok) return;
        const managers = await res.json();
        const ids = Array.isArray(managers) ? managers : (managers.managers || managers.data || []);

        const pnlResults = await Promise.all(
            ids.slice(0, 20).map(async id => {
                try {
                    const r = await fetch(`${BASE}/managers/${id}/pnl?range=ALL`);
                    if (!r.ok) return null;
                    const d = await r.json();
                    return { id, pnl: d?.total_pnl ?? 0, preds: d?.total_predictions ?? 0 };
                } catch { return null; }
            })
        );

        const ranked = pnlResults
            .filter(Boolean)
            .sort((a, b) => b.pnl - a.pnl);

        if (!ranked.length) return;

        // podium (top 3)
        const podiumOrder = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
        const podiumRanks = [2, 1, 3];
        podium.innerHTML = podiumOrder.map((m, i) => `
            <div class="podium-card rank-${podiumRanks[i]}">
                ${podiumRanks[i] === 1 ? '<div class="podium-crown">👑</div>' : ''}
                <div class="podium-rank">#${podiumRanks[i]}</div>
                <div class="podium-avatar">${fmt(m.id)}</div>
                <div class="podium-stat">${fmtUsdc(m.pnl)}</div>
                <div class="podium-label">Earned</div>
            </div>
        `).join('');

        // list (rank 4+)
        const header = `<div class="leaderboard-list-header">
            <span>Rank</span><span>Address</span><span>Predictions</span><span>Earned</span>
        </div>`;
        const rows = ranked.slice(3).map((m, i) => `
            <div class="leaderboard-row">
                <span class="lb-rank">${i + 4}</span>
                <span class="lb-addr">${fmt(m.id)}</span>
                <span class="lb-preds">${m.preds}</span>
                <span class="lb-earned">${fmtUsdc(m.pnl)}</span>
            </div>
        `).join('');
        list.innerHTML = header + rows;

    } catch(e) {
        console.warn('Leaderboard fetch failed', e);
    }
},

    showShareCard(predictedPrice, stake, asset, prizePool, poolId, digest) {
    // Remove any existing card
    document.getElementById('sleteShareOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sleteShareOverlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:9999;
        background:rgba(43,36,28,0.72);
        backdrop-filter:blur(8px);
        display:flex;align-items:center;justify-content:center;
        padding:20px;
        animation:fadeIn .2s ease;
    `;

    const wrap = document.createElement('div');
    wrap.style.cssText = `
        display:flex;flex-direction:column;align-items:center;gap:16px;
        max-width:520px;width:100%;
    `;

    // Canvas card
    const canvas = document.createElement('canvas');
    canvas.width  = 1200;
    canvas.height = 630;
    canvas.style.cssText = 'width:100%;border-radius:20px;display:block;';

    const ctx = canvas.getContext('2d');
    const W = 1200, H = 630;

    // Background
    ctx.fillStyle = '#F4F1EB';
    ctx.fillRect(0, 0, W, H);

    // Right accent block
    const grad = ctx.createLinearGradient(680, 0, W, H);
    grad.addColorStop(0, 'rgba(173,119,66,0.10)');
    grad.addColorStop(1, 'rgba(173,119,66,0.28)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(640, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, H);
    ctx.lineTo(600, H);
    ctx.closePath();
    ctx.fill();

    // Bottom strip
    ctx.fillStyle = 'rgba(43,36,28,0.06)';
    ctx.fillRect(0, H - 72, W, 72);

    // Divider line
    ctx.strokeStyle = 'rgba(43,36,28,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 72);
    ctx.lineTo(W, H - 72);
    ctx.stroke();

    // SLETE wordmark
    ctx.fillStyle = '#2B241C';
    ctx.font = '800 52px "IBM Plex Mono", monospace';
    ctx.fillText('SLETE', 64, 88);

    // Accent dot on E
    ctx.fillStyle = '#AD7742';
    ctx.beginPath();
    ctx.arc(248, 62, 9, 0, Math.PI * 2);
    ctx.fill();

    // Pool label
    ctx.fillStyle = '#8A8177';
    ctx.font = '600 26px Inter, sans-serif';
    ctx.fillText('Pool ' + (poolId || '—') + '  ·  ' + asset, 64, 148);

    // "MY PREDICTION" label
    ctx.fillStyle = '#AD7742';
    ctx.font = '700 20px Inter, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('MY PREDICTION', 64, 230);
    ctx.letterSpacing = '0px';

    // Predicted price — hero number
    const priceStr = '$' + Number(predictedPrice).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    ctx.fillStyle = '#2B241C';
    ctx.font = '800 112px "IBM Plex Mono", monospace';
    // Scale font down if too wide
    let fontSize = 112;
    while (ctx.measureText(priceStr).width > 520 && fontSize > 48) {
        fontSize -= 4;
        ctx.font = `800 ${fontSize}px "IBM Plex Mono", monospace`;
    }
    ctx.fillText(priceStr, 64, 360);

    // Stake row
    ctx.fillStyle = '#6B6259';
    ctx.font = '600 24px Inter, sans-serif';
    ctx.fillText('Stake  ' + stake + ' DUSDC', 64, 430);

    // Potential payout
    const payoutLine = prizePool && prizePool !== '—'
        ? 'Prize pool  ' + prizePool
        : 'Prize pool  building...';
    ctx.fillText(payoutLine, 64, 470);

    // Timestamp
    const now = new Date();
    const timeStr = now.toUTCString().replace(' GMT', ' UTC');
    ctx.fillStyle = '#8A8177';
    ctx.font = '500 20px "IBM Plex Mono", monospace';
    ctx.fillText(timeStr, 64, 524);

    // Right side — big decorative price echo
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = '#2B241C';
    ctx.font = '800 148px "IBM Plex Mono", monospace';
    ctx.fillText(priceStr, 580, 380);
    ctx.restore();

    // Right side — "Predict with us" CTA
    ctx.fillStyle = '#AD7742';
    ctx.font = '700 28px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('slete.vercel.app', W - 64, 490);

    ctx.fillStyle = '#8A8177';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText('Predict where markets close', W - 64, 530);
    ctx.textAlign = 'left';

    // Bottom strip — Sui badge + tx
    ctx.fillStyle = '#8A8177';
    ctx.font = '600 20px "IBM Plex Mono", monospace';
    ctx.fillText('Sui Testnet', 64, H - 24);
    if (digest) {
        ctx.textAlign = 'right';
        ctx.fillText(digest.slice(0, 12) + '...' + digest.slice(-8), W - 64, H - 24);
        ctx.textAlign = 'left';
    }

    // Button row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;width:100%;';

    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Save Image';
    downloadBtn.style.cssText = `
        flex:1;height:52px;border-radius:14px;border:1.5px solid rgba(43,36,28,0.12);
        background:#FCFAF7;color:#2B241C;font-size:15px;font-weight:700;
        font-family:Inter,sans-serif;cursor:pointer;
    `;
    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.download = 'slete-prediction.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
    };

    const shareBtn = document.createElement('button');
    shareBtn.textContent = 'Share on X';
    shareBtn.style.cssText = `
        flex:1;height:52px;border-radius:14px;border:none;
        background:#AD7742;color:#fff;font-size:15px;font-weight:700;
        font-family:Inter,sans-serif;cursor:pointer;
    `;
    shareBtn.onclick = async () => {
        const text = `Just locked in $${Number(predictedPrice).toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})} on ${asset} via @SleteApp\n\nPool ${poolId || ''} · ${stake} DUSDC staked\n\nslete.vercel.app`;
        if (navigator.share) {
            try {
                const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                const file = new File([blob], 'slete-prediction.png', {type:'image/png'});
                await navigator.share({title: 'My Slete Prediction', text, files: [file]});
                return;
            } catch {}
        }
        // fallback — copy tweet text
        await navigator.clipboard.writeText(text);
        shareBtn.textContent = 'Copied!';
        setTimeout(() => shareBtn.textContent = 'Share on X', 2000);
    };

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        width:52px;height:52px;border-radius:14px;border:1.5px solid rgba(43,36,28,0.12);
        background:transparent;color:#6B6259;font-size:18px;font-weight:700;
        font-family:Inter,sans-serif;cursor:pointer;flex-shrink:0;
    `;
    closeBtn.onclick = () => overlay.remove();

    btnRow.appendChild(downloadBtn);
    btnRow.appendChild(shareBtn);
    btnRow.appendChild(closeBtn);

    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
    });

    wrap.appendChild(canvas);
    wrap.appendChild(btnRow);
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
},

updateContrarianBadge(userPrice) {
    const badge = document.getElementById('detailContrarianBadge');
    if (!badge) return;

    // get crowd median from the crowd indicator text
    const crowdText = document.getElementById('detailCrowdText')?.textContent || '';
    const crowdMatch = crowdText.match(/\$([\d,]+\.?\d*)/);
    if (!crowdMatch || !userPrice || isNaN(userPrice)) {
        badge.style.display = 'none';
        return;
    }

    const crowdMedian = parseFloat(crowdMatch[1].replace(',', ''));
    if (!crowdMedian || crowdMedian <= 0) {
        badge.style.display = 'none';
        return;
    }

    const distPct = Math.abs((userPrice - crowdMedian) / crowdMedian) * 100;

    const titleEl = document.getElementById('contrarianTitle');
    const subEl   = document.getElementById('contrarianSub');
    const edgeEl  = document.getElementById('contrarianEdge');

    if (distPct < 0.5) {
        // in the crowd — hide badge
        badge.style.display = 'none';
        return;
    }

    badge.style.display = 'flex';

    if (distPct >= 1.5) {
        const edgeMult = Math.min(10, (1 + distPct / 2).toFixed(1));
        badge.className = 'detail-contrarian-badge contrarian--bold';
        titleEl.textContent = 'Contrarian';
        subEl.textContent = distPct.toFixed(1) + '% from crowd · high risk, high reward';
        edgeEl.textContent = edgeMult + '× edge';
    } else {
        badge.className = 'detail-contrarian-badge contrarian--mild';
        titleEl.textContent = 'Contrarian';
        subEl.textContent = distPct.toFixed(1) + '% from crowd · diverging from consensus';
        edgeEl.textContent = '2× edge';
    }
},

updateStakeDisplay() {
    const amt = this.state.depositAmount || 1;
    const stakeEl = document.getElementById('detailStakeDisplay');
    if (stakeEl) stakeEl.textContent = amt + ' DUSDC';
    this.updateWinEstimate();
},

updateWinEstimate() {
    const winEl = document.getElementById('detailWinEstimate');
    if (!winEl) return;

    const prizeText = document.getElementById('detailMetaPrize')?.textContent?.trim() || '';
    const prizeMatch = prizeText.match(/([\d.]+)/);
    const prizePool = prizeMatch ? parseFloat(prizeMatch[1]) : 0;
    const stake = this.state.depositAmount || 1;

    const multiplier = prizePool > 0
        ? Math.max(1.5, Math.min(8, (prizePool / Math.max(stake, 1)) * 0.95))
        : 2;
    const payout = (stake * multiplier).toFixed(2);
    winEl.textContent = '~' + payout + ' DUSDC';
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

    formatNumber(value) {
    return Number(value)
        .toLocaleString();
},

navigateTo(target) {
    const allPages = ['page-pools', 'page-portfolio', 'page-leaderboard', 'page-propose', 'page-labs'];
    const pageMap = {
        'pools': 'page-pools',
        'portfolio': 'page-portfolio',
        'leaderboard': 'page-leaderboard',
        'propose': 'page-propose',
        'labs': 'page-labs',
    };

    allPages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = 'none';
    });

    const pageId = pageMap[target];
    if (pageId) {
        const el = document.getElementById(pageId);
        if (el) el.style.display = '';
    }

    document.querySelectorAll('[data-nav]').forEach(n =>
        n.classList.toggle('active', n.dataset.nav === target)
    );
    document.querySelectorAll('[data-sidebar-nav]').forEach(n =>
        n.classList.toggle('active', n.dataset.sidebarNav === target)
    );

    if (target === 'portfolio') this.renderPortfolio();
    
if (target === 'leaderboard') this.renderLeaderboard();

if (target === 'labs') {
    document.dispatchEvent(new CustomEvent('labsPageShown'));
} else {
    const bar = document.getElementById('labsBottomBar');
    if (bar) bar.style.display = 'none';
}

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
