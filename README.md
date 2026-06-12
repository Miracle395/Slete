# Slete

**Precison price prediction markets on Sui, powered by DeepBook.**

[slete.vercel.app](https://slete.vercel.app) · Sui Testnet · Overflow 2026. 

---

## What is Slete?

Slete is a prediction market protocol where users stake DUSDC on where a crypto asset's price will close at a set point in time. The predictor closest to the oracle settlement price wins the pool.

It is built on top of DeepBook Predict, Mysten Labs' onchain price oracle and prediction infrastructure on Sui testnet and wraps it in a consumer grade mobile first interface.

---

## How It Works

1. **Browse pools** : each pool is tied to an asset pair (e.g. BTC/USDC) and a duration (6H, 24H, 10D)
2. **Make a prediction** : enter the price you think the asset will close at and stake DUSDC.
3. **Oracle settles** : at expiry, DeepBook's price oracle records the final settlement price onchain.
4. **Payouts distribute** : the three closest predictors split the prize pool on a 60/25/15 tiered model, minus a 5% protocol rake.
5. **Refund rule** : if fewer than 3 predictors join a pool, all stakes are refunded in full.

---

## Payout Model

| Rank | Share of Net Pool |
|------|-------------------|
| 1st (closest) | 60% |
| 2nd | 25% |
| 3rd | 15% |
| Protocol rake | 5% (taken before split) |

Pools with fewer than 3 participants trigger a full refund.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Sui Testnet |
| Oracle / Prediction infra | DeepBook Predict (`predict-server.testnet.mystenlabs.com`) |
| Wallet | Sui wallet adapter ( dApp Kit ) |
| Frontend | Vanilla JS, HTML/CSS, no framework |
| Deployment | Vercel |

**Predict contract ID:** `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a`

---

## Features

- Live BTC/USDC price from DeepBook oracle, refreshed every 15 seconds on pool cards.
- Prediction distribution histogram to see where the crowd is clustering before you predict.
- Price Clusters table with ranked breakdown of prediction density by price range.
- Crowd Target banner with the median prediction across all participants
- Contrarian badge that flags when your prediction diverges significantly from the crowd.
- Accuracy streak tracker in Portfolio.
- Tiered payout with win estimate shown before you confirm.
- Propose Market flow UI for submitting new pool proposals onchain.
- Mobile first, works entirely in browser with no install.

---

## Running Locally

```bash
git clone https://github.com/Miracle395/Slete
cd Slete
# No build step required just open index.html directly or serve with any static server
npx serve 
```

Connect a Sui compatible wallet ( e.g. Slush, Phantom Wallet browser extension ) funded with DUSDC on testnet.

---

## Project Status

Slete is live on Sui testnet as part of Overflow 2026. The protocol layer uses DeepBook Predict's existing oracle and position infrastructure, while Slete provides the curation layer, UI and payout logic on top.

Mainnet deployment and additional asset pairs are the next milestones.

---

Built by [Miracle395](https://github.com/Miracle395)
