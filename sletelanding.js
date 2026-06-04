/* ==========================================================
   SLETE
   Precision Markets on Sui
========================================================== */

const Slete = {

    connected: false,

    init() {

        this.initCountdowns();

        this.initMarketTicker();

        this.initButtons();

        this.animateNumbers();

        console.log(
            '⚡ Slete Initialized'
        );

    },

    /* ======================================================
       BUTTONS
    ====================================================== */

    initButtons() {

        const walletBtn =
            document.querySelector('.wallet-btn');

        if (!walletBtn) return;

        walletBtn.addEventListener(
            'click',
            () => {

                if (!this.connected) {

                    this.connected = true;

                    walletBtn.textContent =
                        'Wallet Connected';

                    walletBtn.classList.add(
                        'connected'
                    );

                }

            }
        );

    },

    /* ======================================================
       MARKET PRICES
    ====================================================== */

    initMarketTicker() {

        const prices = document.querySelectorAll(
            '.ticker-card span'
        );

        if (!prices.length) return;

        setInterval(() => {

            prices.forEach(price => {

                let value =
                    parseFloat(
                        price.textContent
                            .replace('$', '')
                            .replace(',', '')
                    );

                const movement =
                    (Math.random() - 0.5) * 2;

                value += movement;

                price.textContent =
                    '$' +
                    value.toLocaleString(
                        undefined,
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );

            });

        }, 3000);

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

                let seconds =
                    Number(
                        timer.dataset.countdown
                    );

                if (seconds <= 0) return;

                seconds--;

                timer.dataset.countdown =
                    seconds;

                const hrs =
                    Math.floor(seconds / 3600);

                const mins =
                    Math.floor(
                        (seconds % 3600) / 60
                    );

                const secs =
                    seconds % 60;

                timer.textContent =
                    `${String(hrs).padStart(2,'0')}:` +
                    `${String(mins).padStart(2,'0')}:` +
                    `${String(secs).padStart(2,'0')}`;

            });

        }, 1000);

    },

    /* ======================================================
       ANIMATE STATS
    ====================================================== */

    animateNumbers() {

        const stats =
            document.querySelectorAll(
                '[data-stat]'
            );

        stats.forEach(stat => {

            const target =
                Number(
                    stat.dataset.stat
                );

            let current = 0;

            const speed = target / 60;

            const interval =
                setInterval(() => {

                    current += speed;

                    if (current >= target) {

                        current = target;

                        clearInterval(
                            interval
                        );

                    }

                    stat.textContent =
                        Math.floor(current)
                            .toLocaleString();

                }, 16);

        });

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