
# Slete

**Precision price prediction markets on Sui, powered by DeepBook.**

[slete.vercel.app](https://slete.vercel.app) · Sui Testnet · Overflow 2026

---

## What is Slete?

Slete is a precision price prediction market built on Sui. Instead of simply picking up or down, you predict the exact price where an asset closes at expiry, the closer you are to the oracle settlement price, the bigger your share of the prize pool.

Most prediction markets stop at binary. Slete goes further. The precision mechanic changes everything; it rewards genuine price conviction. You have to think carefully about where an asset actually closes, not just which direction it moves. That distinction makes Slete more skill expressive, more replayable, and more interesting to compete in over time.

For those who prefer it simple, Slete also features **Binary Markets** via Slete Labs: a fast, clean up-or-down format where you call the direction, lock in your prediction and watch it play out against a live chart. Same onchain settlement, less complexity.

Built on top of DeepBook Predict; Mysten Labs' onchain oracle and prediction infrastructure on Sui Testnet and wrapped in a consumer grade, mobile first interface designed to make onchain prediction as seamless as possible.

---

## Two Ways to Play

### Vertical Range Markets
Each market defines an asset pair ( BTC ) , a fixed expiry, a minimum strike and a tick size. You pick the exact price level you believe the asset will close at, snapped to the nearest tick and stake DUSDC to enter.

Before you commit, you can see the full distribution of crowd predictions rendered as a histogram across the price range. You can see where consensus is clustering, where the contrarian opportunities are and what the crowd's median target is. Then you decide: follow the crowd or diverge.

The oracle settles at expiry and the three predictors closest to the final price split the prize pool. First place takes 60%, second takes 25%, third takes 15%. A 5% protocol rake is taken from the gross pool before the split.

### Binary Markets
Predict whether an asset closes above or below a target price at expiry; one decision, clean resolution. Binary markets are ideal for shorter durations and higher frequency play where you want conviction on direction without specifying an exact level.

---

## How It Works

1. **Browse pools** : the pools page lists all active markets, each tied to an asset pair and a fixed expiry. Markets are sorted by prize pool size so the most active pools surface first. Each card shows the live asset price, time remaining, current prize pool and predictor count.

2. **Connect your wallet** : Slete uses the Sui Wallet Adapter and supports any Sui compatible wallet. On first prediction, a PredictManager account is automatically created onchain to hold your positions.

3. **Make a prediction** : open a pool, study the crowd distribution, enter your price, choose your stake amount and confirm. Your position is minted onchain as a Move object via DeepBook's predict contract. The transaction is signed through your wallet and recorded transparently on Sui.

4. **Oracle settles** : at expiry, DeepBook's price oracle records the final settlement price onchain. The oracle reads from real market data and the result is immutable once written.

5. **Payouts distribute** : the three closest predictors to the settlement price split the net prize pool. Proximity is measured by absolute distance from the settlement price to your strike. Payouts are claimable directly from your portfolio page.

6. **Refund rule** : if fewer than 3 predictors join a pool before expiry, all stakes are refunded in full. No one loses in a thin market.

---

## Payout Model

| Rank | Share of Net Pool |
|------|-------------------|
| 1st (closest to settlement) | 60% |
| 2nd | 25% |
| 3rd | 15% |
| Protocol rake | 5% (deducted before split) |

The rake funds protocol operations. Pools with fewer than 3 participants trigger a full refund to all stakers.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Blockchain | Sui Testnet |
| Oracle & Prediction infra | DeepBook Predict (`predict-server.testnet.mystenlabs.com`) |
| Smart contracts | Move (DeepBook Predict package) |
| Wallet integration | Sui Wallet Adapter · dApp Kit |
| Frontend | Vanilla JS · HTML · CSS · No framework |
| Deployment | Vercel |

**Predict contract:** `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a`

**Predict package:** `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138`

---

## Features

### Markets & Pricing
- Live asset prices pulled from DeepBook oracle, refreshed every 15 seconds on pool cards and every 10 seconds inside an open pool.
- Markets automatically filtered to only show non-expired, currently active oracles.
- Markets sorted by prize pool size so the most active, highest-value pools surface at the top.
- Pool duration displayed on each card, from sub-hour markets to multi-day windows.

### Prediction UX
- Prediction distribution histogram showing where all current predictors are clustering across the price range, rendered live before you commit.
- Price clusters table with a ranked breakdown of prediction density by price bucket, showing count and percentage of total predictions per range.
- Crowd target banner displaying the median prediction across all current participants and how far it sits from the live price.
- Contrarian badge that activates when your prediction diverges significantly from the crowd median, with an edge multiplier indicating potential upside from going against consensus.
- One tap price fill button to seed your prediction input with the current live price.
- Strike validation against oracle tick size, your prediction is automatically snapped to the nearest valid tick before submission.

### Onchain & Wallet
- Every prediction minted onchain as a Move object via DeepBook's predict contract on Sui Testnet.
- Automatic PredictManager account creation on first prediction.
- Full transaction flow handled through Sui Wallet Adapter with live feedback at each step.
- Oracle revalidation at submit time : if a market has rotated since you opened the pool, the latest active oracle is fetched before the transaction is built.

### Portfolio & History
- Portfolio page showing all open and settled positions with strike, quantity and unrealised PnL.
- Streak tracker counting consecutive accurate predictions with visual dot history.
- Win rate calculated across all settled positions.
- Claim and refund flows built directly into the portfolio, winners and refund eligible positions show a one tap claim button.
- Balance display showing live DUSDC holdings, refreshed on portfolio open.

---


## Running Locally

No build step required. Clone the repo and open `product.html` in a browser, or serve it with any static file server:

```bash
npx serve
```

Connect a Sui wallet with Testnet DUSDC to interact with live markets.

---

## Testnet Tokens

DUSDC is the prediction token on Sui Testnet. You can obtain testnet SUI from the [Sui Testnet Faucet](https://faucet.sui.io) and DUSDC from the DeepBook testnet interface.

---

## Overflow 2026

Slete is submitted to the **Special — DeepBook** track of Sui Overflow 2026. It demonstrates a full consumer facing prediction market experience built entirely on DeepBook Predict, from onchain position minting to oracle settlement and payout distribution.
