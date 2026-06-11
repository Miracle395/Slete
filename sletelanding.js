/* ==========================================================
   SLETE LANDING — FULL ANIMATION SUITE
   Drop-in replacement for sletelanding.js
   All original functionality preserved + extended
========================================================== */

const SlетeLanding = {

    prices: {},
    mouseX: 0,
    mouseY: 0,
    rafActive: false,

    init() {
        this.initCanvas();
        this.initPrices();
        this.initReveal();
        this.initCountUp();
        this.initPools();
        this.initHeroEntrance();
        this.initTypewriter();
        this.initMagneticCards();
        this.initNavScroll();
        this.initParallaxMouse();
        this.observeExplosion();
        this.initCursorTrail();
        this.initSectionSweep();
        this.initButtonRipple();
        this.initTickerScroll();
        this.initLogoMorph();
        this.initFaq();
        console.log(' Slete Landing Full Suite');
    },

    /* ======================================================
       1. CANVAS BACKGROUND — particles + mouse repel
    ====================================================== */

    initCanvas() {
        const canvas = document.getElementById('bgCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let scrollY = 0;
        window.addEventListener('scroll', () => { scrollY = window.scrollY; }, {passive: true});

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            buildStrokes();
        };

       // Falling vertical strokes
        let strokes = [];

        const buildStrokes = () => {
            const isMobile = canvas.width < 768;
            const spacing  = isMobile ? 12 : 18;
            const count    = Math.floor(canvas.width / spacing) + 6;
            strokes = Array.from({length: count}, (_, i) => ({
                x:      (i / count) * canvas.width + (Math.random() - 0.5) * 10,
                y:      Math.random() * -canvas.height * 1.2,
                len:    Math.random() * (isMobile ? 100 : 80) + 40,
                speed:  Math.random() * (isMobile ? 1.8 : 1.4) + 0.6,
                o:      Math.random() * 0.38 + 0.16,
                width:  Math.random() < 0.2 ? 2.2 : (isMobile ? 1.4 : 1.0),
                delay:  Math.random() * 60,
            }));
        };

        resize();
        window.addEventListener('resize', resize);

        let frame = 0;

        // Horizon grid lines — scroll-driven, sweep left→right
        const gridLines = Array.from({length: 8}, (_, i) => ({
            progress: i / 8,   // 0..1 position in viewport
            speed:    0.0004 + i * 0.00015,
        }));

        const drawGrid = () => {
            const vp = canvas.height;
            const horizonY = vp * 0.42;
            const scrollFactor = Math.min(scrollY / (document.body.scrollHeight - vp), 1);

            ctx.save();
            ctx.globalAlpha = 0.07 + scrollFactor * 0.06;

            gridLines.forEach((line, i) => {
                // Perspective: lines converge toward horizon, sweep right as you scroll
                const t = line.progress;
                const y = horizonY + (vp - horizonY) * Math.pow(t, 1.6);
                const xOffset = scrollFactor * canvas.width * 0.45 * t;

                // Left vanishing line
                ctx.beginPath();
                ctx.moveTo(0 + xOffset * 0.3, horizonY);
                ctx.lineTo(canvas.width * 0.1 + xOffset, y);
                ctx.strokeStyle = `rgba(196,136,58,1)`;
                ctx.lineWidth = 0.6 + t * 0.8;
                ctx.stroke();

                // Right vanishing line
                ctx.beginPath();
                ctx.moveTo(canvas.width - xOffset * 0.3, horizonY);
                ctx.lineTo(canvas.width * 0.9 - xOffset, y);
                ctx.strokeStyle = `rgba(196,136,58,1)`;
                ctx.lineWidth = 0.6 + t * 0.8;
                ctx.stroke();

                // Horizontal cross-rule at this depth
                ctx.beginPath();
                ctx.moveTo(canvas.width * 0.1 + xOffset, y);
                ctx.lineTo(canvas.width * 0.9 - xOffset, y);
                ctx.strokeStyle = `rgba(196,136,58,${0.4 + t * 0.4})`;
                ctx.lineWidth = 0.4 + t * 0.5;
                ctx.stroke();
            });

            ctx.restore();
        };

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frame++;

            // Draw perspective grid first (background layer)
            drawGrid();

            // Draw falling strokes on top
            strokes.forEach(s => {
                if (frame < s.delay) return;

                const dx = s.x - this.mouseX;
                const speedMod = Math.abs(dx) < 80 ? 0.5 : 1;
                s.y += s.speed * speedMod;

                if (s.y > canvas.height + s.len) {
                    s.y = -s.len - Math.random() * 160;
                    s.x = Math.random() * canvas.width;
                    s.len = Math.random() * 80 + 40;
                    s.o   = Math.random() * 0.38 + 0.16;
                }

                const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.len);
                grad.addColorStop(0,   `rgba(196,136,58,0)`);
                grad.addColorStop(0.15,`rgba(196,136,58,${s.o})`);
                grad.addColorStop(0.45,`rgba(255,210,130,${s.o})`);
                grad.addColorStop(0.75,`rgba(196,136,58,${s.o * 0.6})`);
                grad.addColorStop(1,   `rgba(196,136,58,0)`);

                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x, s.y + s.len);
                ctx.strokeStyle = grad;
                ctx.lineWidth = s.width;
                ctx.stroke();
            });

            requestAnimationFrame(tick);
        };
        tick();
    },

    /* ======================================================
       2. LIVE PRICES — flash on update
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
            const newText  = fmt(price, decimals);

            // Flash animation on value change
            if (priceEl.textContent !== newText && priceEl.textContent !== '$—') {
                priceEl.style.transition = 'none';
                priceEl.style.color = 'var(--accent)';
                priceEl.style.transform = 'scale(1.12)';
                setTimeout(() => {
                    priceEl.style.transition = 'color 0.6s ease, transform 0.4s ease';
                    priceEl.style.color = '';
                    priceEl.style.transform = '';
                }, 80);
            }

            priceEl.textContent = newText;

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
       3. REVEAL ON SCROLL — staggered with direction
    ====================================================== */

    initReveal() {
        const els = document.querySelectorAll('.reveal');
        const obs = new IntersectionObserver(entries => {
            entries.forEach((e, i) => {
                if (e.isIntersecting) {
                    setTimeout(() => e.target.classList.add('visible'), i * 90);
                    obs.unobserve(e.target);
                }
            });
        }, {threshold: 0.10});
        els.forEach(el => obs.observe(el));
    },

    /* ======================================================
       4. COUNT UP STATS — with easing
    ====================================================== */

    initCountUp() {
        const els = document.querySelectorAll('[data-target]');
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                const el     = e.target;
                const target = parseInt(el.dataset.target);
                const dur    = 1400;
                const start  = performance.now();
                const step   = (now) => {
                    const t    = Math.min((now - start) / dur, 1);
                    const ease = 1 - Math.pow(1 - t, 3);
                    el.textContent = Math.floor(ease * target).toLocaleString();
                    if (t < 1) requestAnimationFrame(step);
                    else el.textContent = target.toLocaleString();
                };
                requestAnimationFrame(step);
                obs.unobserve(el);
            });
        }, {threshold: 0.5});
        els.forEach(el => obs.observe(el));
    },

    /* ======================================================
       5. LIVE POOLS
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

        const buildCards = (oracles) => {
            list.innerHTML = '';
            oracles.slice(0, 6).forEach((o, idx) => {
                const asset    = o.underlying_asset ? o.underlying_asset + ' / USDC' : 'BTC / USDC';
                const expiryMs = Number(o.expiry) > 1e12 ? Number(o.expiry) : Number(o.expiry) * 1000;
                const secsLeft = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
                const poolNum  = String(idx + 1).padStart(2, '0');

                const card = document.createElement('div');
                card.className = 'pool-card-land card-explode';
                card.dataset.explodeIdx = idx;
                card.style.setProperty('--explode-delay', idx * 80 + 'ms');
                card.innerHTML = `
                    <div class="pool-land-asset">${asset}</div>
                    <div class="pool-land-field">
                        <span>Pool</span>
                        <strong>#${poolNum}</strong>
                    </div>
                    <div class="pool-land-field">
                        <span>Closes in</span>
                        <strong class="pool-land-timer${secsLeft < 60 && secsLeft > 0 ? ' timer-urgent' : ''}"
                                data-expiry="${expiryMs}">${fmtCountdown(secsLeft)}</strong>
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

            // Observe for explosion effect
            this.observeExplosion();
            this.initReveal();

            // Live timers
            setInterval(() => {
                document.querySelectorAll('.pool-land-timer').forEach(el => {
                    const expiry = Number(el.dataset.expiry);
                    const secs   = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
                    el.textContent = fmtCountdown(secs);
                    if (secs < 60 && secs > 0) {
                        el.classList.add('timer-urgent');
                    }
                });
            }, 1000);
        };

        try {
            const res = await fetch(PREDICT_SERVER + '/predicts/' + PREDICT_ID + '/oracles');
            if (!res.ok) throw new Error('fetch failed');
            const data    = await res.json();
            const oracles = Array.isArray(data) ? data : (data.oracles || data.data || []);
            if (!oracles.length) throw new Error('empty');
            buildCards(oracles);
        } catch(e) {
            const fallback = [
                {underlying_asset: 'BTC', expiry: Date.now() + 14400000},
                {underlying_asset: 'ETH', expiry: Date.now() + 28800000},
                {underlying_asset: 'SUI', expiry: Date.now() + 7200000},
            ];
            buildCards(fallback);
        }
    },

    /* ======================================================
       6. HERO ENTRANCE — staggered assembly on load
    ====================================================== */

    initHeroEntrance() {
        const elements = [
            '.hero-eyebrow',
            '.hero-headline',
            '.hero-sub',
            '.hero-actions',
            '.hero-ticker',
        ];

        elements.forEach((sel, i) => {
            const el = document.querySelector(sel);
            if (!el) return;
            el.style.opacity    = '0';
            el.style.transform  = 'translateY(32px)';
            el.style.transition = 'none';
        });

        // Trigger after paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                elements.forEach((sel, i) => {
                    const el = document.querySelector(sel);
                    if (!el) return;
                    setTimeout(() => {
                        el.style.transition = `opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                                               transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)`;
                        el.style.opacity   = '1';
                        el.style.transform = 'translateY(0)';
                    }, 120 + i * 110);
                });
            });
        });
    },

    /* ======================================================
       7. TYPEWRITER — hero accent line
    ====================================================== */

    initTypewriter() {
        const accentEl = document.querySelector('.headline-accent');
        if (!accentEl) return;

        const originalText = accentEl.textContent.trim();
        accentEl.textContent = '';
        accentEl.style.borderRight = '3px solid var(--accent)';

        let charIdx = 0;

        const type = () => {
            if (charIdx < originalText.length) {
                accentEl.textContent += originalText[charIdx];
                charIdx++;
                setTimeout(type, 55 + Math.random() * 30);
            } else {
                // Blink cursor then remove
                let blinks = 0;
                const blink = setInterval(() => {
                    accentEl.style.borderRight = blinks % 2 === 0
                        ? '3px solid transparent'
                        : '3px solid var(--accent)';
                    blinks++;
                    if (blinks > 5) {
                        clearInterval(blink);
                        accentEl.style.borderRight = 'none';
                    }
                }, 400);
            }
        };

       // Start after page load settles
        setTimeout(type, 900);
    },

    /* ======================================================
       8. MAGNETIC TILT on cards
    ====================================================== */

    initMagneticCards() {
        const cards = document.querySelectorAll('.step-card, .pool-card-land, .stats-strip, .bottom-cta');

        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect   = card.getBoundingClientRect();
                const cx     = rect.left + rect.width / 2;
                const cy     = rect.top  + rect.height / 2;
                const dx     = (e.clientX - cx) / (rect.width / 2);
                const dy     = (e.clientY - cy) / (rect.height / 2);
                const tiltX  = dy * -7;
                const tiltY  = dx * 7;
                const shine  = `radial-gradient(circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px,
                                rgba(173,119,66,0.12) 0%, transparent 65%)`;
                card.style.transform  = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(4px)`;
                card.style.background = `${shine}, var(--surface)`;
                card.style.transition = 'transform 0.1s ease, box-shadow 0.2s ease';
                card.style.boxShadow  = `0 ${12 + Math.abs(dy * 8)}px ${32 + Math.abs(dx * 12)}px rgba(173,119,66,0.12)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1), background 0.4s ease, box-shadow 0.4s ease';
                card.style.transform  = '';
                card.style.background = '';
                card.style.boxShadow  = '';
            });
        });
    },

    /* ======================================================
       9. NAV SCROLL — blur + live BTC price appears
    ====================================================== */

    initNavScroll() {
        // BTC badge removed — nav stays dark on scroll
    },

    /* ======================================================
       10. PARALLAX MOUSE — canvas & hero shift
    ====================================================== */

    initParallaxMouse() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            const xPct = (e.clientX / window.innerWidth  - 0.5);
            const yPct = (e.clientY / window.innerHeight - 0.5);

            const headline = document.querySelector('.hero-headline');
            if (headline) {
                headline.style.transform = `translate(${xPct * 6}px, ${yPct * 4}px)`;
                headline.style.transition = 'transform 0.8s cubic-bezier(0.16,1,0.3,1)';
            }

            const canvas = document.getElementById('bgCanvas');
            if (canvas) {
                canvas.style.transform = `translate(${xPct * 12}px, ${yPct * 8}px)`;
                canvas.style.transition = 'transform 1.2s ease';
            }
        }, {passive: true});
    },

    /* ======================================================
       11. CARD EXPLOSION — fold in then explode to position
    ====================================================== */

    observeExplosion() {
        const section = document.querySelector('.pools-section');
        if (!section) return;

        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                obs.disconnect();

                const cards = document.querySelectorAll('.card-explode');
                cards.forEach((card, i) => {
                    // Start: cards collapsed into center, rotated, scaled down
                    card.style.transition = 'none';
                    card.style.opacity    = '0';
                    card.style.transform  = `translateY(60px) scale(0.7) rotateX(25deg)`;
                    card.style.filter     = 'blur(4px)';

                    setTimeout(() => {
                        card.style.transition = `
                            opacity   0.55s cubic-bezier(0.16,1,0.3,1),
                            transform 0.55s cubic-bezier(0.16,1,0.3,1),
                            filter    0.4s ease
                        `;
                        card.style.opacity   = '1';
                        card.style.transform = 'translateY(0) scale(1) rotateX(0deg)';
                        card.style.filter    = 'blur(0)';
                    }, 80 + i * 90);
                });
            });
        }, {threshold: 0.15});

        obs.observe(section);
    },

    /* ======================================================
       12. CURSOR TRAIL — bronze dots follow mouse
    ====================================================== */

    initCursorTrail() {
        // Only on desktop
        if (window.innerWidth < 1024) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const trail = [];
        const count = 8;

        for (let i = 0; i < count; i++) {
            const dot = document.createElement('div');
            dot.style.cssText = `
                position: fixed;
                width: ${4 - i * 0.35}px;
                height: ${4 - i * 0.35}px;
                border-radius: 50%;
                background: rgba(173,119,66,${0.5 - i * 0.055});
                pointer-events: none;
                z-index: 9999;
                transition: none;
                transform: translate(-50%,-50%);
                will-change: transform;
            `;
            document.body.appendChild(dot);
            trail.push({ el: dot, x: 0, y: 0 });
        }

        let mx = 0, my = 0;
        document.addEventListener('mousemove', e => {
            mx = e.clientX;
            my = e.clientY;
        }, {passive: true});

        const animTrail = () => {
            trail.forEach((dot, i) => {
                const target = i === 0
                    ? { x: mx, y: my }
                    : { x: trail[i - 1].x, y: trail[i - 1].y };
                dot.x += (target.x - dot.x) * (0.35 - i * 0.025);
                dot.y += (target.y - dot.y) * (0.35 - i * 0.025);
                dot.el.style.left = dot.x + 'px';
                dot.el.style.top  = dot.y + 'px';
            });
            requestAnimationFrame(animTrail);
        };
        animTrail();
    },
    
    /* ======================================================
       13. SECTION SWEEP — horizontal line wipe on section enter
    ====================================================== */

    initSectionSweep() {
        const sections = document.querySelectorAll('.how, .pools-section, .stats-strip, .bottom-cta');

        sections.forEach(section => {
            // Inject sweep line
            const line = document.createElement('div');
            line.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                height: 2px;
                width: 0;
                background: linear-gradient(90deg, transparent, var(--accent), transparent);
                opacity: 0.6;
                pointer-events: none;
                transition: none;
                z-index: 2;
            `;
            if (window.getComputedStyle(section).position === 'static') {
                section.style.position = 'relative';
            }
            section.appendChild(line);

            const obs = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (!e.isIntersecting) return;
                    line.style.transition = 'width 0.8s cubic-bezier(0.16,1,0.3,1)';
                    line.style.width = '100%';
                    obs.unobserve(section);
                });
            }, {threshold: 0.1});
            obs.observe(section);
        });
    },

    /* ======================================================
       14. BUTTON RIPPLE — click ripple effect
    ====================================================== */

    initButtonRipple() {
        const buttons = document.querySelectorAll('.primary-btn, .ghost-btn, .pool-land-predict, .wallet-btn');

        buttons.forEach(btn => {
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';

            btn.addEventListener('click', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const ripple = document.createElement('span');
                ripple.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                    width: 0;
                    height: 0;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.35);
                    transform: translate(-50%,-50%);
                    animation: rippleAnim 0.5s ease-out forwards;
                    pointer-events: none;
                `;
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 520);
            });
        });

        // Inject ripple keyframe
        if (!document.getElementById('rippleStyle')) {
            const style = document.createElement('style');
            style.id = 'rippleStyle';
            style.textContent = `
                @keyframes rippleAnim {
                    to { width: 200px; height: 200px; opacity: 0; }
                }
                .timer-urgent {
                    color: var(--red) !important;
                    animation: timerPulse 0.8s ease-in-out infinite;
                }
                @keyframes timerPulse {
                    0%,100% { opacity: 1; }
                    50%      { opacity: 0.45; }
                }
                .card-explode {
                    will-change: transform, opacity;
                }
                .hero-headline {
                    will-change: transform;
                }
            `;
            document.head.appendChild(style);
        }
    },

    /* ======================================================
       15. TICKER MARQUEE — auto-scroll on mobile
    ====================================================== */

    initTickerScroll() {
        const ticker = document.querySelector('.hero-ticker');
        if (!ticker || window.innerWidth >= 1024) return;

        // Clone content for seamless loop
        const original = ticker.innerHTML;
        ticker.innerHTML = original + original;
        ticker.style.display    = 'flex';
        ticker.style.whiteSpace = 'nowrap';
        ticker.style.overflow   = 'hidden';

        let pos = 0;
        const speed = 0.5;
        const halfWidth = ticker.scrollWidth / 2;

        const scroll = () => {
            pos += speed;
            if (pos >= halfWidth) pos = 0;
            ticker.scrollLeft = pos;
            requestAnimationFrame(scroll);
        };
        scroll();
    },

    /* ======================================================
       17. FAQ ACCORDION
    ====================================================== */

    initFaq() {
        const items = document.querySelectorAll('.faq-item');
        if (!items.length) return;

        items.forEach(item => {
            const trigger = item.querySelector('.faq-trigger');
            const body    = item.querySelector('.faq-body');
            const icon    = item.querySelector('.faq-icon');

            trigger.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');

                // Close all
                items.forEach(i => {
                    i.classList.remove('open');
                    i.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
                    i.querySelector('.faq-icon').textContent = '+';
                    const b = i.querySelector('.faq-body');
                    b.style.maxHeight = '0';
                    b.style.overflow  = 'hidden';
                    b.style.transition = 'max-height 0.35s cubic-bezier(0.16,1,0.3,1)';
                });

                if (!isOpen) {
                    item.classList.add('open');
                    trigger.setAttribute('aria-expanded', 'true');
                    icon.textContent = '−';
                    body.style.display  = 'block';
                    body.style.maxHeight = '0';
                    body.style.overflow  = 'hidden';
                    // Force reflow
                    body.offsetHeight;
                    body.style.transition = 'max-height 0.4s cubic-bezier(0.16,1,0.3,1)';
                    body.style.maxHeight  = body.scrollHeight + 'px';
                }
            });

            // Init closed state
            body.style.display   = 'none';
            body.style.maxHeight = '0';
            body.style.overflow  = 'hidden';
        });
    },

    /* ======================================================
       16. LOGO MORPH — subtle letter spacing pulse on hover
    ====================================================== */

    initLogoMorph() {
        const logo = document.querySelector('.logo');
        if (!logo) return;

        logo.addEventListener('mouseenter', () => {
            logo.style.transition    = 'letter-spacing 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s ease';
            logo.style.letterSpacing = '4px';
            logo.style.transform     = 'scale(1.04)';
        });

        logo.addEventListener('mouseleave', () => {
            logo.style.letterSpacing = '';
            logo.style.transform     = '';
        });

        // Subtle pulse on load
        setTimeout(() => {
            logo.style.transition    = 'letter-spacing 0.6s ease, transform 0.6s ease';
            logo.style.letterSpacing = '3px';
            logo.style.transform     = 'scale(1.03)';
            setTimeout(() => {
                logo.style.letterSpacing = '';
                logo.style.transform     = '';
            }, 700);
        }, 800);
    },

};

document.addEventListener('DOMContentLoaded', () => SlетeLanding.init());