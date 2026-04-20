import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export interface HoldingBreakdown {
  ticker: string;
  name: string;
  sector: string;
  directShares: number;
  directValue: number;
  indirectShares: number;
  indirectValue: number;
  totalShares: number;
  totalValue: number;
  percentOfPortfolio: number;
  etfBreakdown: Array<{
    etfTicker: string;
    etfName: string;
    sharesInETF: number;
    valueInETF: number;
    weight: number;
  }>;
}

export interface SectorBreakdown {
  sector: string;
  totalValue: number;
  percent: number;
  holdings: number;
}

export interface PortfolioBreakdown {
  consolidatedHoldings: HoldingBreakdown[];
  sectorBreakdown: SectorBreakdown[];
  totalValue: number;
  rawTotalValue: number;
  directCount: number;
  etfCount: number;
  etfAnalysis: Array<{
    etfTicker: string;
    etfName: string;
    totalValue: number;
    topHoldings: Array<{
      ticker: string;
      name: string;
      weight: number;
      value: number;
    }>;
  }>;
}

class DatabaseService {
  private etfTickerCache: Set<string> | null = null;

  async getETFTickers(): Promise<Set<string>> {
    if (this.etfTickerCache) return this.etfTickerCache;
    try {
      const result = await pool.query('SELECT ticker FROM etfs');
      this.etfTickerCache = new Set(result.rows.map((r: any) => r.ticker.toUpperCase()));
      return this.etfTickerCache;
    } catch (error) {
      console.error('Error fetching ETF tickers from database:', error);
      return new Set();
    }
  }

  async getETFHoldings(etfTicker: string): Promise<Array<{ticker: string, name: string, sector: string, weight: number}>> {
    try {
      const query = `
        SELECT h.ticker, h.name, h.sector, eh.weight_percent as weight
        FROM etfs e
        JOIN etf_holdings eh ON eh.etf_id = e.id
        JOIN holdings h ON h.id = eh.holding_id
        WHERE e.ticker = $1
        ORDER BY eh.weight_percent DESC
      `;
      const result = await pool.query(query, [etfTicker]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching ETF holdings for ${etfTicker}:`, error);
      return [];
    }
  }
}

const databaseService = new DatabaseService();

export async function analyzePortfolio(portfolioData: any): Promise<PortfolioBreakdown> {
  const securities = Object.fromEntries(
    (portfolioData.securities || []).map((s: any) => [s.security_id, s])
  );
  const holdings = portfolioData.holdings || [];

  // Look up which tickers are ETFs from the database (not regex heuristic)
  const etfTickers = await databaseService.getETFTickers();

  const directHoldings = new Map<string, {
    ticker: string; name: string; shares: number; value: number; price: number;
  }>();
  const etfHoldings: Array<{
    ticker: string; name: string; shares: number; value: number; price: number;
  }> = [];

  let rawTotalValue = 0;

  holdings.forEach((holding: any) => {
    const security = securities[holding.security_id] || {};
    const ticker = security.ticker_symbol || security.name || 'Unknown';
    const name = security.name || ticker;
    const shares = holding.quantity || 0;
    const value = holding.institution_value || 0;
    const price = holding.institution_price || 0;

    rawTotalValue += value;

    if (etfTickers.has(ticker.toUpperCase())) {
      etfHoldings.push({ ticker, name, shares, value, price });
    } else {
      directHoldings.set(ticker, { ticker, name, shares, value, price });
    }
  });

  // Analyze each ETF's underlying holdings
  const etfAnalysis = [];
  const indirectHoldings = new Map<string, {
    name: string;
    sector: string;
    totalShares: number;
    totalValue: number;
    etfBreakdown: Array<{
      etfTicker: string;
      etfName: string;
      sharesInETF: number;
      valueInETF: number;
      weight: number;
    }>;
  }>();

  for (const etf of etfHoldings) {
    const etfData = await databaseService.getETFHoldings(etf.ticker);

    if (etfData && etfData.length > 0) {
      etfAnalysis.push({
        etfTicker: etf.ticker,
        etfName: etf.name,
        totalValue: etf.value,
        topHoldings: etfData.slice(0, 10).map(h => ({
          ticker: h.ticker || 'Unknown',
          name: h.name || 'Unknown',
          weight: h.weight || 0,
          value: (etf.value * (h.weight || 0)) / 100
        }))
      });

      // Accumulate indirect exposure per underlying holding
      etfData.forEach(h => {
        if (h.ticker && h.weight) {
          const indirectShares = (etf.shares * h.weight) / 100;
          const indirectValue = (etf.value * h.weight) / 100;

          if (!indirectHoldings.has(h.ticker)) {
            indirectHoldings.set(h.ticker, {
              name: h.name || h.ticker,
              sector: h.sector || 'Unknown',
              totalShares: 0,
              totalValue: 0,
              etfBreakdown: []
            });
          }

          const existing = indirectHoldings.get(h.ticker)!;
          existing.totalShares += indirectShares;
          existing.totalValue += indirectValue;
          existing.etfBreakdown.push({
            etfTicker: etf.ticker,
            etfName: etf.name,
            sharesInETF: indirectShares,
            valueInETF: indirectValue,
            weight: h.weight
          });
        }
      });
    } else {
      etfAnalysis.push({
        etfTicker: etf.ticker,
        etfName: etf.name,
        totalValue: etf.value,
        topHoldings: []
      });
    }
  }

  // Consolidate direct + indirect holdings
  const allTickers = new Set([...directHoldings.keys(), ...indirectHoldings.keys()]);

  const consolidatedHoldings: HoldingBreakdown[] = Array.from(allTickers).map(ticker => {
    const direct = directHoldings.get(ticker);
    const indirect = indirectHoldings.get(ticker);
    const totalValue = (direct?.value || 0) + (indirect?.totalValue || 0);

    return {
      ticker,
      name: direct?.name || indirect?.name || ticker,
      sector: indirect?.sector || 'Unknown',
      directShares: direct?.shares || 0,
      directValue: direct?.value || 0,
      indirectShares: indirect?.totalShares || 0,
      indirectValue: indirect?.totalValue || 0,
      totalShares: (direct?.shares || 0) + (indirect?.totalShares || 0),
      totalValue,
      percentOfPortfolio: rawTotalValue > 0 ? (totalValue / rawTotalValue) * 100 : 0,
      etfBreakdown: indirect?.etfBreakdown || []
    };
  });

  consolidatedHoldings.sort((a, b) => b.totalValue - a.totalValue);

  // Build sector breakdown
  const sectorMap = new Map<string, { totalValue: number; holdings: number }>();
  for (const h of consolidatedHoldings) {
    const sector = h.sector || 'Unknown';
    const existing = sectorMap.get(sector) || { totalValue: 0, holdings: 0 };
    existing.totalValue += h.totalValue;
    existing.holdings += 1;
    sectorMap.set(sector, existing);
  }
  const sectorBreakdown: SectorBreakdown[] = Array.from(sectorMap.entries())
    .map(([sector, data]) => ({
      sector,
      totalValue: data.totalValue,
      percent: rawTotalValue > 0 ? (data.totalValue / rawTotalValue) * 100 : 0,
      holdings: data.holdings,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  console.log(`📊 Database analysis complete:`);
  console.log(`   - ${consolidatedHoldings.length} consolidated holdings found`);
  console.log(`   - ${etfAnalysis.length} ETFs analyzed`);
  console.log(`   - ${sectorBreakdown.length} sectors identified`);
  console.log(`   - Raw portfolio value: $${Math.round(rawTotalValue * 100) / 100}`);

  return {
    consolidatedHoldings,
    sectorBreakdown,
    totalValue: rawTotalValue,
    rawTotalValue,
    directCount: directHoldings.size,
    etfCount: etfHoldings.length,
    etfAnalysis
  };
}