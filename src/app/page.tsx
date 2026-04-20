'use client';

import { useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// ── Types ───────────────────────────────────────────────────────────
interface ConsolidatedHolding {
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

interface SectorBreakdown {
  sector: string;
  totalValue: number;
  percent: number;
  holdings: number;
}

interface PortfolioBreakdown {
  consolidatedHoldings: ConsolidatedHolding[];
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

interface ResponseData {
  originalHoldings?: any;
  portfolioBreakdown?: PortfolioBreakdown;
  hasBreakdown?: boolean;
  error?: string;
}

const COLORS = [
  '#4e79a7', '#59a14f', '#f28e2b', '#76b7b2', '#b07aa1',
  '#edc948', '#9c755f', '#86bcb6', '#8cd17d', '#bab0ac',
  '#499894', '#d4a257', '#a87fbf', '#6dae5c', '#5e94b5',
];

// ── Helpers ─────────────────────────────────────────────────────────
const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtPct = (n: number) => `${Math.round(n * 100) / 100}%`;

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `$${Math.round(n / 10_000) / 100}M`;
  if (n >= 1_000) return `$${Math.round(n / 10) / 100}K`;
  return fmtCurrency(n);
};

// ── Component ───────────────────────────────────────────────────────
export default function Home() {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [results, setResults] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createLinkToken = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/create-link-token', { method: 'POST' });
      const data = await res.json();
      if (data.error) { setResults({ error: data.error }); return; }
      setLinkToken(data.link_token);
    } catch (e) {
      setResults({ error: `Error creating link token: ${e}` });
    } finally {
      setIsLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token: string) => {
      try {
        setResults(null);
        setIsLoading(true);
        const res = await fetch('/api/exchange-and-fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token }),
        });
        const data: ResponseData = await res.json();
        if (res.ok) setResults(data);
        else setResults({ error: `Error: ${data.error || 'Unknown'}` });
      } catch (e) {
        setResults({ error: `Error fetching holdings: ${e}` });
      } finally {
        setIsLoading(false);
      }
    },
    onExit: (err) => {
      if (err) setResults({ error: `Link exited: ${err.error_message || 'Unknown'}` });
      setIsLoading(false);
    },
  });

  const handleConnect = async () => {
    if (!linkToken) { await createLinkToken(); return; }
    if (ready) open();
  };

  if (linkToken && ready && !results && !isLoading) open();

  // ── Stats Bar ────────────────────────────────────────────────────
  const renderStatsBar = (bd: PortfolioBreakdown) => {
    const topHolding = bd.consolidatedHoldings[0];
    const topSector = bd.sectorBreakdown[0];

    return (
      <div className="shrink-0 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-8">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Total</span>
            <span className="font-serif text-xl font-bold">{fmtCurrency(bd.totalValue)}</span>
          </div>
          <div className="w-px h-5 bg-[var(--border)]" />
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Holdings</span>
            <span className="font-serif text-xl font-bold">{bd.directCount + bd.etfCount}</span>
            <span className="text-xs text-[var(--muted)]">{bd.directCount} direct · {bd.etfCount} ETFs</span>
          </div>
          <div className="w-px h-5 bg-[var(--border)]" />
          {topHolding && (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Top</span>
                <span className="font-serif text-lg font-bold">{topHolding.ticker}</span>
                <span className="text-xs text-[var(--muted)]">{fmtPct(topHolding.percentOfPortfolio)}</span>
              </div>
              <div className="w-px h-5 bg-[var(--border)]" />
            </>
          )}
          {topSector && (
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Sector</span>
              <span className="font-serif text-sm font-bold truncate max-w-[120px]">{topSector.sector}</span>
              <span className="text-xs text-[var(--muted)]">{fmtPct(topSector.percent)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Charts Row ──────────────────────────────────────────────────
  const renderCharts = (bd: PortfolioBreakdown) => {
    const topHoldings = bd.consolidatedHoldings.slice(0, 10).map((h, i) => ({
      name: h.ticker,
      value: Math.round(h.totalValue * 100) / 100,
      fill: COLORS[i % COLORS.length],
    }));

    const sectorData = bd.sectorBreakdown.slice(0, 10).map((s, i) => ({
      name: s.sector,
      value: Math.round(s.percent * 100) / 100,
      amount: Math.round(s.totalValue * 100) / 100,
      fill: COLORS[i % COLORS.length],
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Holdings Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Holdings by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topHoldings} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} fontSize={11} stroke="#6b6b6b" />
                <YAxis type="category" dataKey="name" width={50} fontSize={11} stroke="#6b6b6b" />
                <Tooltip
                  formatter={(val) => [fmtCurrency(Number(val)), 'Value']}
                  contentStyle={{ border: '1px solid var(--border)', background: 'var(--background)', fontSize: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                  {topHoldings.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sector Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sector Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={1}
                    dataKey="value"
                    label={({ name, value }) => `${name} ${value}%`}
                    labelLine={false}
                    fontSize={10}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    {sectorData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, _name, props) => [
                      `${val}% (${fmtCurrency((props as any).payload.amount)})`,
                      (props as any).payload.name,
                    ]}
                    contentStyle={{ border: '1px solid var(--border)', background: 'var(--background)', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-[var(--muted)]">
                No sector data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ── Consolidated Holdings Table ─────────────────────────────────
  const renderHoldingsTable = (holdings: ConsolidatedHolding[]) => (
    <Card>
      <CardHeader>
        <CardTitle>Consolidated Holdings</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea>
          <table className="w-full text-sm">
            <thead className="bg-[var(--background)] sticky top-0 z-10 border-b border-[var(--border)]">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Symbol</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Sector</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Direct</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Via ETFs</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Total</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">% Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {holdings.map((h) => (
                <tr key={h.ticker} className="hover:bg-[#f0ede8] transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-mono font-semibold">{h.ticker}</div>
                    <div className="text-xs text-[var(--muted)] max-w-[160px] truncate">{h.name}</div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary" className="text-[10px]">{h.sector}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div>{fmtCurrency(h.directValue)}</div>
                    {h.directShares > 0 && (
                      <div className="text-xs text-[var(--muted)]">
                        {Math.round(h.directShares * 10000) / 10000} sh
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div>{fmtCurrency(h.indirectValue)}</div>
                    {h.etfBreakdown.length > 0 && (
                      <div className="text-xs text-[var(--muted)]">
                        via {h.etfBreakdown.map(e => e.etfTicker).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {fmtCurrency(h.totalValue)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 bg-[var(--border)] h-1">
                        <div
                          className="bg-[var(--foreground)] h-1"
                          style={{ width: `${Math.min(h.percentOfPortfolio, 100)}%` }}
                        />
                      </div>
                      <span className="text-[var(--muted)] text-xs w-12 text-right">
                        {fmtPct(h.percentOfPortfolio)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  // ── ETF Breakdown Cards ─────────────────────────────────────────
  const renderETFCards = (
    etfAnalysis: PortfolioBreakdown['etfAnalysis']
  ) => {
    if (etfAnalysis.length === 0) return null;

    return (
      <div>
        <h3 className="font-serif text-lg font-semibold mb-4">ETF Breakdown</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {etfAnalysis.map((etf) => {
            const maxWeight = etf.topHoldings.length > 0
              ? Math.max(...etf.topHoldings.map(h => h.weight))
              : 100;

            return (
              <Card key={etf.etfTicker}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-serif text-xl font-bold">{etf.etfTicker}</h4>
                      <p className="text-xs text-[var(--muted)]">{etf.etfName}</p>
                    </div>
                    <Badge>{fmtCurrency(etf.totalValue)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {etf.topHoldings.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Top Holdings</p>
                      {etf.topHoldings.slice(0, 8).map((h, hi) => (
                        <div key={h.ticker} className="flex items-center gap-2">
                          <span className="w-12 text-xs font-mono shrink-0">
                            {h.ticker}
                          </span>
                          <div className="flex-1 bg-[var(--border)] h-1.5 overflow-hidden">
                            <div
                              className="h-1.5"
                              style={{
                                width: `${(h.weight / maxWeight) * 100}%`,
                                backgroundColor: COLORS[hi % COLORS.length],
                              }}
                            />
                          </div>
                          <span className="w-12 text-xs text-right text-[var(--muted)]">
                            {fmtPct(h.weight)}
                          </span>
                          <span className="w-16 text-xs text-right font-medium">
                            {fmtCurrency(h.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Raw Holdings (friendly) ─────────────────────────────────────
  const renderRawHoldings = () => {
    const data = results?.originalHoldings;
    if (!data) return null;

    const securities: Record<string, any> = Object.fromEntries(
      (data.securities || []).map((s: any) => [s.security_id, s])
    );
    const accounts: Record<string, any> = Object.fromEntries(
      (data.accounts || []).map((a: any) => [a.account_id, a])
    );
    const byAccount: Record<string, any[]> = {};
    (data.holdings || []).forEach((h: any) => {
      (byAccount[h.account_id] ||= []).push(h);
    });

    return (
      <div className="space-y-4">
        {Object.entries(byAccount).map(([accountId, items]) => {
          const acct = accounts[accountId] || {};
          const sorted = [...items].sort(
            (a, b) => (b.institution_value || 0) - (a.institution_value || 0)
          );
          const acctTotal = sorted.reduce((s, h) => s + (h.institution_value || 0), 0);

          return (
            <Card key={accountId}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-serif text-base font-semibold">
                      {acct.name || 'Unknown Account'}
                    </h4>
                    <Badge variant="secondary" className="mt-1">
                      {(acct.subtype || acct.type || 'account').toUpperCase()}
                    </Badge>
                  </div>
                  <p className="font-serif text-lg font-bold">{fmtCurrency(acctTotal)}</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea>
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--background)] sticky top-0 z-10 border-b border-[var(--border)]">
                      <tr>
                        <th className="px-5 py-2 text-left text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Ticker</th>
                        <th className="px-5 py-2 text-left text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Name</th>
                        <th className="px-5 py-2 text-right text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Qty</th>
                        <th className="px-5 py-2 text-right text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Price</th>
                        <th className="px-5 py-2 text-right text-[10px] font-semibold tracking-widest uppercase text-[var(--muted)]">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {sorted.map((h, i) => {
                        const sec = securities[h.security_id] || {};
                        return (
                          <tr key={i} className="hover:bg-[#f0ede8] transition-colors">
                            <td className="px-5 py-2 font-mono font-medium">
                              {sec.ticker_symbol || 'N/A'}
                            </td>
                            <td className="px-5 py-2 text-[var(--muted)] max-w-[200px] truncate">
                              {sec.name || '—'}
                            </td>
                            <td className="px-5 py-2 text-right">{h.quantity ?? 0}</td>
                            <td className="px-5 py-2 text-right">
                              {fmtCurrency(h.institution_price || 0)}
                            </td>
                            <td className="px-5 py-2 text-right font-medium">
                              {fmtCurrency(h.institution_value || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // ── Main render ─────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Header */}
      <header className="shrink-0 border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[var(--foreground)]">
              Portfolio Tracker
            </h1>
            <p className="text-xs text-[var(--muted)] tracking-wide">
              ETF look-through analysis
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wide uppercase border border-[var(--foreground)] text-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading && (
              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isLoading
              ? results ? 'Analyzing…' : 'Connecting…'
              : 'Connect Brokerage'}
          </button>
        </div>
      </header>

      {/* Stats bar */}
      {results && !results.error && results.hasBreakdown && results.portfolioBreakdown &&
        renderStatsBar(results.portfolioBreakdown)
      }

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Error */}
        {results?.error && (
          <div className="max-w-7xl mx-auto w-full px-6 pt-4">
            <div className="border border-[var(--accent)] text-[var(--accent)] px-5 py-4 text-sm">
              <strong>Error:</strong> {results.error}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!results && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
            <div className="text-center">
              <PieIcon className="mx-auto h-10 w-10 mb-5 stroke-1" />
              <p className="font-serif text-xl">Connect your brokerage to view your portfolio</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !results && (
          <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
            <div className="text-center">
              <svg className="animate-spin mx-auto h-8 w-8 mb-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="font-serif text-xl">Connecting to your brokerage…</p>
            </div>
          </div>
        )}

        {/* Results */}
        {results && !results.error && (
          <Tabs
            defaultValue={results.hasBreakdown ? 'overview' : 'holdings'}
            className="flex-1 min-h-0 flex flex-col"
          >
            <div className="shrink-0 max-w-7xl mx-auto w-full px-6 pt-4">
              <TabsList>
                <TabsTrigger value="overview" disabled={!results.hasBreakdown}>
                  Overview
                </TabsTrigger>
                <TabsTrigger value="consolidated" disabled={!results.hasBreakdown}>
                  Consolidated
                </TabsTrigger>
                <TabsTrigger value="etfs" disabled={!results.hasBreakdown}>
                  ETF Breakdown
                </TabsTrigger>
                <TabsTrigger value="holdings">
                  Raw Holdings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="flex-1 min-h-0 overflow-auto pt-4">
              <div className="max-w-7xl mx-auto px-6 pb-6">
                {results.portfolioBreakdown && renderCharts(results.portfolioBreakdown)}
              </div>
            </TabsContent>

            <TabsContent value="consolidated" className="flex-1 min-h-0 overflow-auto pt-4">
              <div className="max-w-7xl mx-auto px-6 pb-6">
                {results.portfolioBreakdown &&
                  renderHoldingsTable(results.portfolioBreakdown.consolidatedHoldings)}
              </div>
            </TabsContent>

            <TabsContent value="etfs" className="flex-1 min-h-0 overflow-auto pt-4">
              <div className="max-w-7xl mx-auto px-6 pb-6">
                {results.portfolioBreakdown &&
                  renderETFCards(results.portfolioBreakdown.etfAnalysis)}
              </div>
            </TabsContent>

            <TabsContent value="holdings" className="flex-1 min-h-0 overflow-auto pt-4">
              <div className="max-w-7xl mx-auto px-6 pb-6">
                {renderRawHoldings()}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
