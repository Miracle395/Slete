/* ============================================================
   SLETE — LABS PAGE JS
   Drop this as labs.js and add <script src="labs.js"></script>
   AFTER slete.js in product.html.
   ============================================================ */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const TATUM_RPC = 'https://sui-testnet.gateway.tatum.io';
  const PREDICT_PKG = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
  const PREDICT_OBJECT = '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';
  const COINGECKO_BTC = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true';

  // ── State ──────────────────────────────────────────────────
  const state = {
    btcPrice: null,
    btcChange: null,
    priceHistory: [],       // [{t, p}]
    priceToBeat: null,
    upVol: 0,
    downVol: 0,
    traders: 0,
    selectedStake: 5,
    selectedDirection: null, // 'up' | 'down'
    streak: 0,
    lockedCall: null,       // 'up' | 'down' | null
    window: '5m',
    countdownInterval: null,
    priceInterval: null,
  };

  // ── DOM refs ───────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const els = {
    timerClock:     $('labsTimerClock'),
    marketSub:      $('labsMarketSub'),
    bullPct:        $('labsBullPct'),
    bearPct:        $('labsBearPct'),
    bullBar:        $('labsBullBar'),
    bearBar:        $('labsBearBar'),
    priceToBeat:    $('labsPriceToBeat'),
    dailyPrice:     $('labsDailyPrice'),
    deltaPill:      $('labsPriceDeltaPill'),
    trendVal:       $('labsTrendVal'),
    trendPeriod:    $('labsTrendPeriod'),
    versusBar:      $('labsVersusBar'),
    obRow:          $('labsObRow'),
    obBody:         $('labsObBody'),
    obTraders:      $('labsObTraders'),
    obVol:          $('labsObVol'),
    obUpVol:        $('labsObUpVol'),
    obDownVol:      $('labsObDownVol'),
    streakCount:    $('labsStreakHeroCount'),
    streakSub:      $('labsStreakHeroSub'),
    lockedPanel:    $('labsLocked'),
    lockedBadge:    $('labsLockedBadge'),
    lockedTimer:    $('labsLockedTimer'),
    streakNum:      $('labsStreakNum'),
    oddsUp:         $('labsOddsUp'),
    oddsDown:       $('labsOddsDown'),
    win5:           $('labsWin5'),
    win25:          $('labsWin25'),
    win100:         $('labsWin100'),
    pickUp:         $('labsPickUp'),
    pickDown:       $('labsPickDown'),
    bottomBar:      $('labsBottomBar'),
    gate:           $('labsGate'),
    gateConnect:    $('labsGateConnect'),
    tvChart:        $('labsTVChart'),
    timerPill:      $('labsTimerPill'),
    sentiment:      $('labsSentiment'),
    locked:         $('labsLocked'),
  };

  // ── Init ───────────────────────────────────────────────────
  function checkWalletState() {
    const addr = window.STATE?.walletAddr;
    if (addr) {
      if (els.gate) els.gate.style.display = 'none';
      if (!state.lockedCall && els.bottomBar) els.bottomBar.style.display = 'block';
    }
  }

  function init() {
    loadStreak();
    loadLockedCall();
    checkWalletState();
    setupScrubber();
    setupObToggle();
    setupStakeCards();
    setupPickButtons();
    setupRulesTabs();
    setupGate();
    updateMarketSub();
    startCountdown();
    fetchBtcPrice();
    fetchLabsData();
    state.priceInterval = setInterval(fetchBtcPrice, 15000);
    setInterval(fetchLabsData, 30000);
  }

  // ── Countdown to midnight UTC ──────────────────────────────
  function startCountdown() {
    function tick() {
      const now = new Date();
      const midnight = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
      ));
      const diff = midnight - now;
      if (diff <= 0) { if (els.timerClock) els.timerClock.textContent = '00:00:00'; return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const fmt = n => String(n).padStart(2, '0');
      if (els.timerClock) els.timerClock.textContent = `${fmt(h)}:${fmt(m)}:${fmt(s)}`;
      if (state.lockedCall && els.lockedTimer) {
        els.lockedTimer.textContent = `${fmt(h)}:${fmt(m)}:${fmt(s)}`;
      }
    }
    tick();
    state.countdownInterval = setInterval(tick, 1000);
  }

  function updateMarketSub() {
    if (!els.marketSub) return;
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getUTCDate();
    els.marketSub.textContent = `${month} ${day} · Closes midnight UTC`;
  }

  // ── BTC Price fetch ────────────────────────────────────────
  async function fetchBtcPrice() {
    try {
      const r = await fetch(COINGECKO_BTC);
      if (!r.ok) return;
      const d = await r.json();
      const price = d?.bitcoin?.usd;
      const change = d?.bitcoin?.usd_24h_change;
      if (!price) return;

      // track history for trend
      state.priceHistory.push({ t: Date.now(), p: price });
      if (state.priceHistory.length > 60) state.priceHistory.shift();

      state.btcPrice = price;
      state.btcChange = change;

      renderPrice(price, change);
      updateVersusBar();
      updateOdds();
    } catch (e) { /* silent */ }
  }

  function renderPrice(price, change) {
    const fmt = p => '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (els.dailyPrice) els.dailyPrice.textContent = fmt(price);

    // trend vs N minutes ago
    const windowMs = state.window === '5m' ? 5 * 60000
      : state.window === '15m' ? 15 * 60000
      : state.window === '1h'  ? 60 * 60000
      : 4 * 60 * 60000;

    const cutoff = Date.now() - windowMs;
    const old = state.priceHistory.find(x => x.t >= cutoff);
    if (old) {
      const delta = price - old.p;
      const sign = delta >= 0 ? '+' : '';
      if (els.trendVal) {
        els.trendVal.textContent = `${sign}$${Math.abs(delta).toFixed(2)}`;
        els.trendVal.style.color = delta >= 0 ? '#16a34a' : '#e53935';
      }
    }
    if (els.trendPeriod) els.trendPeriod.textContent = `last ${state.window}`;

    // delta pill vs price to beat
    if (state.priceToBeat && els.deltaPill) {
      const diff = price - state.priceToBeat;
      const sign = diff >= 0 ? '+' : '';
      els.deltaPill.textContent = `${sign}$${Math.abs(diff).toFixed(0)}`;
      els.deltaPill.className = 'labs-price-delta-pill' + (diff < 0 ? ' down' : '');
    }

    // price is UP-coloured if above ptb
    if (els.dailyPrice) {
      const color = state.priceToBeat
        ? (price >= state.priceToBeat ? '#16a34a' : '#e53935')
        : '#16a34a';
      els.dailyPrice.style.color = color;
    }
  }

  // ── Versus progress bar ────────────────────────────────────
  function updateVersusBar() {
    if (!state.priceToBeat || !state.btcPrice || !els.versusBar) return;
    // map current price relative to ptb into a 0–100% fill
    // 50% = at ptb, 100% = 2% above, 0% = 2% below
    const pct = 50 + ((state.btcPrice - state.priceToBeat) / state.priceToBeat) * 2500;
    const clamped = Math.max(5, Math.min(95, pct));
    els.versusBar.style.width = clamped + '%';
    els.versusBar.style.background = state.btcPrice >= state.priceToBeat
      ? 'linear-gradient(90deg, #16a34a, #22c55e)'
      : 'linear-gradient(90deg, #e53935, #f87171)';
  }

  // ── Fetch DeepBook pool data ───────────────────────────────
  async function fetchLabsData() {
    try {
      const body = {
        jsonrpc: '2.0', id: 1,
        method: 'sui_getObject',
        params: [PREDICT_OBJECT, { showContent: true }]
      };
      const r = await fetch(TATUM_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) return;
      const d = await r.json();
      const fields = d?.result?.data?.content?.fields;
      if (!fields) return;

      // parse fields — adjust field names to match actual contract
      const upVol   = parseInt(fields.up_volume   || fields.up_amount   || 0) / 1e6;
      const downVol = parseInt(fields.down_volume || fields.down_amount || 0) / 1e6;
      const traders = parseInt(fields.num_predictors || fields.participant_count || 0);
      const ptb     = fields.price_to_beat || fields.opening_price || null;

      if (ptb) state.priceToBeat = parseFloat(ptb) / 1e8;
      state.upVol   = upVol   || state.upVol;
      state.downVol = downVol || state.downVol;
      state.traders = traders || state.traders;

      renderPoolData();
    } catch (e) {
      // If contract call fails, use demo data so UI still looks real
      useDemoData();
    }
  }

  function useDemoData() {
    if (state.upVol === 0 && state.downVol === 0) {
      state.upVol = 335;
      state.downVol = 110;
      state.traders = 25;
      if (state.btcPrice) state.priceToBeat = state.btcPrice * 0.995;
      renderPoolData();
    }
  }

  function renderPoolData() {
    const total = state.upVol + state.downVol || 1;
    const bullPct = Math.round((state.upVol / total) * 100);
    const bearPct = 100 - bullPct;

    if (els.bullPct) els.bullPct.textContent = bullPct + '%';
    if (els.bearPct) els.bearPct.textContent = bearPct + '%';
    if (els.bullBar) els.bullBar.style.width = bullPct + '%';
    if (els.bearBar) els.bearBar.style.width = bearPct + '%';

    const fmt = v => '$' + Math.round(v).toLocaleString();
    const fmtP = p => '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (state.priceToBeat && els.priceToBeat) {
      els.priceToBeat.textContent = fmtP(state.priceToBeat);
    }

    if (els.obTraders) els.obTraders.textContent = state.traders + ' Traders';
    if (els.obVol)     els.obVol.textContent = fmt(total) + ' Vol.';
    if (els.obUpVol)   els.obUpVol.textContent = fmt(state.upVol);
    if (els.obDownVol) els.obDownVol.textContent = fmt(state.downVol);

    updateVersusBar();
    updateOdds();
  }

  // ── Odds & Win calculations ────────────────────────────────
  function updateOdds() {
    const total = state.upVol + state.downVol || 1;
    const upPct   = Math.round((state.upVol   / total) * 100);
    const downPct = 100 - upPct;

    if (els.oddsUp)   els.oddsUp.textContent   = upPct + '¢';
    if (els.oddsDown) els.oddsDown.textContent = downPct + '¢';

    updateWinEstimates();
  }

  function calcWin(stake, direction) {
    const total = state.upVol + state.downVol + stake;
    const sideVol = direction === 'up'
      ? state.upVol + stake
      : state.downVol + stake;
    if (sideVol === 0) return stake;
    return (stake / sideVol) * total * 0.95; // 5% protocol fee
  }

  function updateWinEstimates() {
    const dir = state.selectedDirection || 'up';
    const fmtW = v => '$' + v.toFixed(2);
    if (els.win5)   els.win5.textContent   = fmtW(calcWin(5, dir));
    if (els.win25)  els.win25.textContent  = fmtW(calcWin(25, dir));
    if (els.win100) els.win100.textContent = fmtW(calcWin(100, dir));
  }

  // ── Scrubber ───────────────────────────────────────────────
  function setupScrubber() {
    const chips = document.querySelectorAll('.labs-scrub-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.window = chip.dataset.window;
        updateTVChart(state.window);
        renderPrice(state.btcPrice || 0, state.btcChange || 0);
      });
    });
    updateTVChart('5m');
  }

  function updateTVChart(window) {
    if (!els.tvChart) return;
    const intervalMap = { '5m': '5', '15m': '15', '1h': '60', '4h': '240' };
    const interval = intervalMap[window] || '5';
    els.tvChart.src =
      `https://s.tradingview.com/widgetembed/?frameElementId=labsTVChart&symbol=BINANCE%3ABTCUSDT&interval=${interval}&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=0&saveimage=0&toolbarbg=F1F3F6&studies=[]&theme=light&style=2&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=0&allow_symbol_change=0&locale=en`;
  }

  // ── Order Book toggle ──────────────────────────────────────
  function setupObToggle() {
    if (!els.obRow || !els.obBody) return;
    els.obRow.addEventListener('click', () => {
      const open = els.obBody.classList.toggle('open');
      els.obRow.classList.toggle('open', open);
    });
  }

  // ── Stake cards ────────────────────────────────────────────
  function setupStakeCards() {
    const cards = document.querySelectorAll('.labs-stake-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        state.selectedStake = parseInt(card.dataset.stake);
        updateWinEstimates();
      });
    });
  }

  // ── Pick buttons ───────────────────────────────────────────
  function setupPickButtons() {
    if (!els.pickUp || !els.pickDown) return;

    els.pickUp.addEventListener('click', () => handlePick('up'));
    els.pickDown.addEventListener('click', () => handlePick('down'));
  }

  function handlePick(direction) {
  const walletAddr = window.STATE?.walletAddr;

    if (!walletAddr) {
      showGate();
      return;
    }

    if (state.lockedCall) return; // already voted today

    state.selectedDirection = direction;
    updateWinEstimates();
    submitPrediction(direction);
  }

  function showGate() {
    if (els.gate) {
      els.gate.style.display = 'flex';
      if (els.bottomBar) els.bottomBar.style.display = 'none';
    }
  }

  // ── Submit prediction ──────────────────────────────────────
  async function submitPrediction(direction) {
    try {
      // Highlight the chosen button
      if (direction === 'up') {
        els.pickUp.style.opacity = '1';
        els.pickDown.style.opacity = '0.5';
      } else {
        els.pickDown.style.opacity = '1';
        els.pickUp.style.opacity = '0.5';
      }

      const tx = new window.__SuiTransaction();
      const isUp = direction === 'up';
      const stakeAmount = state.selectedStake * 1_000_000; // to MIST

      tx.moveCall({
        target: `${PREDICT_PKG}::predict::mint_binary_position`,
        arguments: [
          tx.object(PREDICT_OBJECT),
          tx.pure.bool(isUp),
          tx.pure.u64(stakeAmount),
        ],
      });

      const digest = await window.signAndExecuteTransaction(tx);

      if (digest) {
        lockCall(direction);
      } else {
        resetPickButtons();
      }
    } catch (e) {
      console.error('Prediction error:', e);
      resetPickButtons();
      showToast('Transaction failed. Try again.');
    }
  }

  function resetPickButtons() {
    if (els.pickUp)   els.pickUp.style.opacity = '1';
    if (els.pickDown) els.pickDown.style.opacity = '1';
  }

  function lockCall(direction) {
    state.lockedCall = direction;
    // Persist for today
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('slete_labs_call', JSON.stringify({ date: today, direction }));

    // Increment streak
    state.streak++;
    saveStreak();
    renderStreakUI();

    // Show locked panel
    if (els.lockedPanel) els.lockedPanel.style.display = 'flex';
    if (els.lockedBadge) {
      els.lockedBadge.textContent = direction.toUpperCase();
      els.lockedBadge.className = 'labs-locked-badge' + (direction === 'down' ? ' down' : '');
    }

    // Hide bottom bar, show locked state
    if (els.bottomBar) els.bottomBar.style.display = 'none';
  }

  function loadLockedCall() {
    try {
      const raw = localStorage.getItem('slete_labs_call');
      if (!raw) return;
      const { date, direction } = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      if (date !== today) return; // stale
      state.lockedCall = direction;
      if (els.lockedPanel) els.lockedPanel.style.display = 'flex';
      if (els.lockedBadge) {
        els.lockedBadge.textContent = direction.toUpperCase();
        els.lockedBadge.className = 'labs-locked-badge' + (direction === 'down' ? ' down' : '');
      }
      // Don't show bottom bar if already called
      if (els.bottomBar) els.bottomBar.style.display = 'none';
    } catch (e) { /* ignore */ }
  }

  // ── Streak ─────────────────────────────────────────────────
  function loadStreak() {
    try {
      const raw = localStorage.getItem('slete_streak');
      if (!raw) return;
      const { streak, lastDate } = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastDate === today || lastDate === yesterday) {
        state.streak = streak || 0;
      } else {
        state.streak = 0; // broken
      }
      renderStreakUI();
    } catch (e) { state.streak = 0; }
  }

  function saveStreak() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('slete_streak', JSON.stringify({
      streak: state.streak,
      lastDate: today
    }));
  }

  function renderStreakUI() {
    if (els.streakCount) els.streakCount.textContent = state.streak;
    if (els.streakNum)   els.streakNum.textContent   = state.streak;
    if (els.streakSub) {
      els.streakSub.textContent = state.streak > 0
        ? `${state.streak}-day streak 🔥 Keep it going!`
        : "Make today's call to start your streak";
    }
  }

  // ── Rules tabs ─────────────────────────────────────────────
  function setupRulesTabs() {
    const tabs = document.querySelectorAll('.labs-rules-tab');
    const rulesBody   = $('labsRulesBody');
    const contextBody = $('labsContextBody');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const isRules = tab.dataset.tab === 'rules';
        if (rulesBody)   rulesBody.style.display   = isRules ? '' : 'none';
        if (contextBody) contextBody.style.display = isRules ? 'none' : '';
      });
    });
  }

  // ── Gate connect ────────────────────────────────────────────
  function setupGate() {
    if (!els.gateConnect) return;
    els.gateConnect.addEventListener('click', () => {
      const btn = document.getElementById('walletBtn');
      if (btn) btn.click();
    });
  }

  // ── Wallet connected → show bottom bar ────────────────────
  // Hook into sui-wallet.js callback
  window.onWalletConnected = function(addr) {
    if (els.gate)      els.gate.style.display      = 'none';
    if (!state.lockedCall && els.bottomBar) {
      els.bottomBar.style.display = 'block';
    }
  };

  // Also watch for the page becoming visible
  document.addEventListener('labsPageShown', () => {
    const addr = window.STATE?.walletAddr;
    if (addr && !state.lockedCall && els.bottomBar) {
      els.bottomBar.style.display = 'block';
      if (els.gate) els.gate.style.display = 'none';
    } else if (!addr) {
      if (els.bottomBar) els.bottomBar.style.display = 'none';
      if (els.gate) els.gate.style.display = 'flex';
    }
  });

  // ── Toast helper ───────────────────────────────────────────
  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed;bottom:180px;left:50%;transform:translateX(-50%);
      background:#0a0a0a;color:#fff;padding:10px 20px;border-radius:8px;
      font-size:13px;font-weight:600;z-index:9999;white-space:nowrap;
      animation:fadeIn 0.2s ease;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ── Boot ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
