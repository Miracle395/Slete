/* ============================================================
   SLETE — LABS PAGE JS
   Drop this as labs.js and add <script src="labs.js"></script>
   AFTER slete.js in product.html.
   ============================================================ */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const TATUM_RPC    = 'https://sui-testnet.gateway.tatum.io';
  const TATUM_KEY    = 't-6a1314026dcffd29f3321133-b2b7fb9669494fdebadaf640';
  const PREDICT_PKG  = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
  const PREDICT_OBJ  = '0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a';
  const PREDICT_SVR  = 'https://predict-server.testnet.mystenlabs.com';
  const CLOCK_OBJ    = '0x6';
  const DUSDC_TYPE   = '0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC';
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
      // Fast path: pull oracle state from predict server (same source submitPrediction uses)
      const oracleListRes = await fetch(
        `${PREDICT_SVR}/predicts/${PREDICT_OBJ}/oracles`,
        { signal: AbortSignal.timeout(5000), mode: 'cors' }
      );
      if (!oracleListRes.ok) throw new Error('oracle list failed');
      const oraclePayload = await oracleListRes.json();
      const allOracles = Array.isArray(oraclePayload)
        ? oraclePayload
        : (oraclePayload.oracles || oraclePayload.data || []);

      const oracle = allOracles
        .filter(o => o.status === 'active' && (o.underlying_asset || 'BTC') === 'BTC')
        .sort((a, b) => Number(b.activated_at || 0) - Number(a.activated_at || 0))[0];

      if (!oracle) throw new Error('no active oracle');

      // Get live price from oracle
      const priceRes = await fetch(
        `${PREDICT_SVR}/oracles/${oracle.oracle_id}/prices/latest`,
        { signal: AbortSignal.timeout(4000) }
      );
      const priceData = priceRes.ok ? await priceRes.json() : null;
      if (priceData?.spot) {
        state.priceToBeat = Number(priceData.spot) / 1e9;
      }

     // Pull position summary for vol/traders
      // Positions are range markets: split by strike vs current spot
      // Strike above spot = bullish (betting price goes up past their strike)
      // Strike below spot = bearish
      const summaryRes = await fetch(
        `${PREDICT_SVR}/positions/minted?oracle_id=${oracle.oracle_id}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (summaryRes.ok) {
        const positions = await summaryRes.json();
        const all = Array.isArray(positions) ? positions : (positions.positions || positions.data || []);
        state.traders = all.length;

        if (all.length > 0) {
          const upPositions   = all.filter(p => p.is_up === true);
          const downPositions = all.filter(p => p.is_up === false);

          const wavg = positions => {
            const totalQty = positions.reduce((s, p) => s + Number(p.quantity || 0), 0);
            if (!totalQty) return null;
            return positions.reduce((s, p) => s + Number(p.ask_price || 0) * Number(p.quantity || 0), 0) / totalQty;
          };

          const upAvgAsk   = wavg(upPositions);
          const downAvgAsk = wavg(downPositions);

          if (upAvgAsk !== null) {
            state.upVol   = upAvgAsk / 1e9 * 100;
            state.downVol = (1 - upAvgAsk / 1e9) * 100;
          } else if (downAvgAsk !== null) {
            state.downVol = downAvgAsk / 1e9 * 100;
            state.upVol   = (1 - downAvgAsk / 1e9) * 100;
          }

          const uniqueManagers = new Set(all.map(p => p.manager_id).filter(Boolean));
          state.traders = uniqueManagers.size;
        }
      }

      renderPoolData();
    } catch (e) {
      console.warn('[Labs] fetchLabsData failed:', e.message);
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
    if (els.obVol)     els.obVol.textContent = state.traders > 0 ? state.traders + ' active' : '—';
    if (els.obUpVol)   els.obUpVol.textContent = state.upVol   > 0 ? Math.round(state.upVol)   + '%' : '—';
    if (els.obDownVol) els.obDownVol.textContent = state.downVol > 0 ? Math.round(state.downVol) + '%' : '—';

    updateVersusBar();
    updateOdds();
  }

  // ── Odds & Win calculations ────────────────────────────────
  function updateOdds() {
    const hasVol = state.upVol + state.downVol > 0;
    const total  = hasVol ? state.upVol + state.downVol : 1;
    const upPct   = hasVol ? Math.round((state.upVol   / total) * 100) : null;
    const downPct = hasVol ? 100 - upPct : null;

    if (els.oddsUp)   els.oddsUp.textContent   = upPct   !== null ? upPct   + '¢' : '—';
    if (els.oddsDown) els.oddsDown.textContent = downPct !== null ? downPct + '¢' : '—';

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
    const dir    = state.selectedDirection || 'up';
    const hasVol = state.upVol + state.downVol > 0;
    const fmtW   = v => '$' + v.toFixed(2);

    if (els.win5)   els.win5.textContent   = hasVol ? fmtW(calcWin(5,   dir)) : '—';
    if (els.win25)  els.win25.textContent  = hasVol ? fmtW(calcWin(25,  dir)) : '—';
    if (els.win100) els.win100.textContent = hasVol ? fmtW(calcWin(100, dir)) : '—';
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

    if (state.lockedCall) return;

    // Don't allow pick if odds haven't loaded yet
    if (state.upVol === 0 && state.downVol === 0) {
      showToast('Loading market data — try again in a moment.');
      return;
    }

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
    const btn = direction === 'up' ? els.pickUp : els.pickDown;
    const otherBtn = direction === 'up' ? els.pickDown : els.pickUp;

    // Optimistic highlight
    if (btn) btn.style.opacity = '1';
    if (otherBtn) otherBtn.style.opacity = '0.5';
    if (btn) btn.textContent = 'Submitting...';

    try {
      const Transaction = window.__SuiTransaction;
      if (!Transaction) throw new Error('SETUP_ERROR');
      if (typeof window.signAndExecuteTransaction !== 'function') throw new Error('WALLET_ERROR');

      const walletAddr = window.STATE?.walletAddr;
      if (!walletAddr) throw new Error('NOT_CONNECTED');

      // ── Step 1: Resolve the active BTC oracle ────────────────────────
      const oracleListRes = await fetch(
        `${PREDICT_SVR}/predicts/${PREDICT_OBJ}/oracles`
      );
      if (!oracleListRes.ok) throw new Error('ORACLE_FETCH_FAILED');
      const oraclePayload = await oracleListRes.json();
      const allOracles = Array.isArray(oraclePayload)
        ? oraclePayload
        : (oraclePayload.oracles || oraclePayload.data || []);

      const oracle = allOracles
        .filter(o => o.status === 'active' && (o.underlying_asset || 'BTC') === 'BTC')
        .sort((a, b) => Number(b.activated_at || 0) - Number(a.activated_at || 0))[0];

      if (!oracle) throw new Error('NO_ACTIVE_ORACLE');

      const oracleId  = oracle.oracle_id;
      const expiryRaw = Number(oracle.expiry || 0);
      const expiryMs  = expiryRaw > 1e12 ? expiryRaw : expiryRaw * 1000;

      // ── Step 2: Get tick size and current spot price ─────────────────
      const liveStateRes = await fetch(`${PREDICT_SVR}/oracles/${oracleId}/state`);
      const liveState = liveStateRes.ok ? await liveStateRes.json() : null;
      const tickSize  = Number(liveState?.oracle?.tick_size || 1_000_000_000);

      const priceRes  = await fetch(`${PREDICT_SVR}/oracles/${oracleId}/prices/latest`);
      const priceData = priceRes.ok ? await priceRes.json() : null;
      const spotRaw   = priceData?.spot ? Number(priceData.spot) : null;
      if (!spotRaw) throw new Error('NO_ORACLE_PRICE');

      // Snap to tick
      const strikeRaw = Math.round(spotRaw / tickSize) * tickSize;

      // ── Step 3: Ensure PredictManager exists ─────────────────────────
      const storageKey = `slete_manager_${walletAddr}`;
      let managerObjId = localStorage.getItem(storageKey);

      if (!managerObjId) {
        if (btn) btn.textContent = 'Creating account...';
        const setupTx = new Transaction();
        setupTx.setSender(walletAddr);
        setupTx.moveCall({
          target: `${PREDICT_PKG}::predict::create_manager`,
          arguments: [],
        });
        const setupDigest = await window.signAndExecuteTransaction(setupTx);

        if (btn) btn.textContent = 'Fetching account...';
        await new Promise(r => setTimeout(r, 2000));

        const txRes = await fetch(TATUM_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': TATUM_KEY },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'sui_getTransactionBlock',
            params: [setupDigest, { showObjectChanges: true }]
          })
        });
        const txData = await txRes.json();
        const created = txData?.result?.objectChanges?.find(
          c => c.type === 'created' && c.objectType?.includes('PredictManager')
        );
        if (!created?.objectId) throw new Error('MANAGER_FETCH_FAILED');
        managerObjId = created.objectId;
        localStorage.setItem(storageKey, managerObjId);
      }

      // Track this manager in leaderboard pool
      const known = JSON.parse(localStorage.getItem('slete_known_wallets') || '[]');
      if (!known.includes(managerObjId)) {
        known.push(managerObjId);
        localStorage.setItem('slete_known_wallets', JSON.stringify(known));
      }

      // ── Step 4: Fetch user's DUSDC coin ──────────────────────────────
      if (btn) btn.textContent = 'Submitting on Sui...';
      const DEPOSIT_AMOUNT = BigInt(Math.round(state.selectedStake * 1_000_000));

      const coinsRes = await fetch(TATUM_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': TATUM_KEY },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'suix_getCoins',
          params: [walletAddr, DUSDC_TYPE, null, 1]
        })
      });
      const coinsData = await coinsRes.json();
      const dusdcCoin = coinsData?.result?.data?.[0];
      if (!dusdcCoin) throw new Error('NO_DUSDC_BALANCE');

      // ── Step 5: Build and send transaction ───────────────────────────
      const tx = new Transaction();
      tx.setSender(walletAddr);

      const [depositCoin] = tx.splitCoins(
        tx.object(dusdcCoin.coinObjectId),
        [tx.pure.u64(DEPOSIT_AMOUNT)]
      );

      tx.moveCall({
        target: `${PREDICT_PKG}::predict_manager::deposit`,
        typeArguments: [DUSDC_TYPE],
        arguments: [tx.object(managerObjId), depositCoin],
      });

      const marketKey = tx.moveCall({
        target: `${PREDICT_PKG}::market_key::${direction}`,
        arguments: [
          tx.pure.id(oracleId),
          tx.pure.u64(BigInt(expiryMs)),
          tx.pure.u64(BigInt(strikeRaw)),
        ],
      });

      tx.moveCall({
        target: `${PREDICT_PKG}::predict::mint`,
        typeArguments: [DUSDC_TYPE],
        arguments: [
          tx.object(PREDICT_OBJ),
          tx.object(managerObjId),
          tx.object(oracleId),
          marketKey,
          tx.pure.u64(DEPOSIT_AMOUNT),
          tx.object(CLOCK_OBJ),
        ],
      });

      const digest = await window.signAndExecuteTransaction(tx);

      if (digest) {
        lockCall(direction);
      } else {
        resetPickButtons();
      }

    } catch (e) {
      console.error('[Labs] Prediction error:', e);
      resetPickButtons();
      const msg = e.message === 'NO_DUSDC_BALANCE'
        ? 'No DUSDC balance found.'
        : e.message === 'NO_ACTIVE_ORACLE'
        ? 'No active BTC oracle right now.'
        : 'Transaction failed. Try again.';
      showToast(msg);
    } finally {
      // Restore button label regardless of outcome
      if (els.pickUp) els.pickUp.textContent = `Up ${els.oddsUp?.textContent || ''}`.trim();
      if (els.pickDown) els.pickDown.textContent = `Down ${els.oddsDown?.textContent || ''}`.trim();
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
  const _prevOnWalletConnected = window.onWalletConnected;
  window.onWalletConnected = function(addr) {
    if (typeof _prevOnWalletConnected === 'function') _prevOnWalletConnected(addr);
    // Re-query live — els captured at parse time may be stale
    const gate      = document.getElementById('labsGate');
    const bottomBar = document.getElementById('labsBottomBar');
    if (gate)      gate.style.display = 'none';
    if (!state.lockedCall && bottomBar) bottomBar.style.display = 'block';
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
