import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  throw new Error('Missing required Plaid environment variables');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export function printHoldingsToConsole(data: any): void {
  const securities = Object.fromEntries(
    (data.securities || []).map((s: any) => [s.security_id, s])
  );
  const accounts = Object.fromEntries(
    (data.accounts || []).map((a: any) => [a.account_id, a])
  );
  const holdings = data.holdings || [];

  const byAccount: { [key: string]: any[] } = {};
  holdings.forEach((h: any) => {
    if (!byAccount[h.account_id]) {
      byAccount[h.account_id] = [];
    }
    byAccount[h.account_id].push(h);
  });

  const W = [12, 12, 10, 14]; // Column widths
  const rowWidth = W.reduce((sum, w) => sum + w, 0) + 3;
  const divider = '-'.repeat(rowWidth);

  console.log();
  console.log(`${'PORTFOLIO HOLDINGS'.padStart((rowWidth + 17) / 2)}`);
  console.log(divider);

  let grandTotal = 0.0;

  Object.entries(byAccount).forEach(([accountId, items]) => {
    const acct = accounts[accountId] || {};
    const subtype = (acct.subtype || 'UNKNOWN').toUpperCase();
    
    console.log(`\n  ${acct.name || 'Unknown'}  [${subtype}]`);
    console.log(`  ${'Ticker'.padEnd(W[0])}  ${'Quantity'.padStart(W[1])}  ${'Price'.padStart(W[2])}  ${'Value'.padStart(W[3])}`);
    console.log(`  ${divider}`);

    let acctTotal = 0.0;
    
    items
      .sort((a, b) => -(a.institution_value || 0) + (b.institution_value || 0))
      .forEach((h) => {
        const sec = securities[h.security_id] || {};
        const ticker = sec.ticker_symbol || sec.name || 'N/A';
        const qty = h.quantity || 0;
        const price = h.institution_price || 0.0;
        const value = h.institution_value || (qty * price);
        const cur = h.iso_currency_code || 'USD';

        try {
          const safeQty = Math.round((Number(qty) || 0) * 10000) / 10000;
          const safePrice = Math.round((Number(price) || 0) * 100) / 100;
          const safeValue = Math.round((Number(value) || 0) * 100) / 100;
          console.log(
            `  ${String(ticker).padEnd(W[0])}  ${String(safeQty).padStart(W[1])}  ${String(safePrice).padStart(W[2])}  ${String(safeValue).padStart(W[3] - 4)} ${cur}`
          );
        } catch {
          console.log(
            `  ${String(ticker).padEnd(W[0])}  ${String(qty).padStart(W[1])}  ${String(price).padStart(W[2])}  ${String(value).padStart(W[3] - 4)} ${cur}`
          );
        }

        acctTotal += parseFloat(String(value || 0));
      });

    console.log(`  ${divider}`);
    const safeAcctTotal = Math.round((Number(acctTotal) || 0) * 100) / 100;
    console.log(
      `  ${'Account Total'.padEnd(W[0] + W[1] + W[2] + 4)}  ${String(safeAcctTotal).padStart(W[3] - 4)} USD`
    );
    grandTotal += acctTotal;
  });

  console.log();
  const safeGrandTotal = Math.round((Number(grandTotal) || 0) * 100) / 100;
  console.log(
    `  ${'Total Portfolio Value'.padEnd(W[0] + W[1] + W[2] + 4)}  ${String(safeGrandTotal).padStart(W[3] - 4)} USD`
  );
  console.log(divider);
  console.log();
}