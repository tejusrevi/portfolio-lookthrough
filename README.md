# Portfolio Tracker

<img width="1444" height="739" alt="image" src="https://github.com/user-attachments/assets/6e2cf495-3d99-493b-9d4c-6d8e0f5ce8fb" />

Next.js app that connects to brokerage accounts via Plaid, fetches holdings, and breaks down ETF positions into their underlying stocks using a Neon PostgreSQL database. Shows consolidated exposure, sector allocation, and charts.

## Setup

Create a `.env.local` file with:

```
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
DATABASE_URL=your_neon_postgres_connection_string
```

- Get Plaid credentials from https://dashboard.plaid.com/team/keys
- `PLAID_ENV` can be `sandbox`, `development`, or `production`
- `DATABASE_URL` should point to a Neon PostgreSQL database with `etfs`, `holdings`, and `etf_holdings` tables

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and click "Connect Brokerage" to link an account.

### Other Platforms
See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for other hosting options.

## 📈 Populating ETF Data

To populate your database with ETF holdings data, you can:

1. **Manual Entry**: Insert ETF and holdings data manually
2. **CSV Import**: Import from financial data providers
3. **API Integration**: Build scripts to fetch from financial APIs
4. **Data Updates**: Set up regular updates for current holdings

Example data insertion:
```sql
-- Insert ETF
INSERT INTO etfs (ticker, name) VALUES ('XEQT', 'iShares Core Equity ETF');

-- Insert holdings
INSERT INTO holdings (ticker, name) VALUES ('AAPL', 'Apple Inc.');

-- Link ETF to holdings with weights
INSERT INTO etf_holdings (etf_id, holding_id, weight_percent) 
VALUES (1, 1, 4.5); -- XEQT holds 4.5% AAPL
```

## ⚠️ Disclaimer

This tool is for informational purposes only. Not financial advice. Always verify holdings data with your brokerage directly.
