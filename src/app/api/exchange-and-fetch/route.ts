import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, printHoldingsToConsole } from '@/lib/plaid';
import { analyzePortfolio } from '@/lib/database';
import { 
  ItemPublicTokenExchangeRequest,
  InvestmentsHoldingsGetRequest 
} from 'plaid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { public_token } = body;

    if (!public_token) {
      return NextResponse.json(
        { error: 'Public token is required' }, 
        { status: 400 }
      );
    }

    // 1. Exchange the public token for an access token
    const exchangeRequest: ItemPublicTokenExchangeRequest = {
      public_token,
    };
    
    const exchangeResponse = await plaidClient.itemPublicTokenExchange(exchangeRequest);
    const accessToken = exchangeResponse.data.access_token;

    // 2. Fetch Holdings using the access token
    const holdingsRequest: InvestmentsHoldingsGetRequest = {
      access_token: accessToken,
    };
    
    const holdingsResponse = await plaidClient.investmentsHoldingsGet(holdingsRequest);
    const holdingsData = holdingsResponse.data;

    // 3. Print to server console using custom formatting
    printHoldingsToConsole(holdingsData);

    // 4. Analyze portfolio using Neon database
    let portfolioBreakdown = null;
    try {
      if (process.env.DATABASE_URL) {
        console.log('🔍 Analyzing portfolio using Neon database...');
        portfolioBreakdown = await analyzePortfolio(holdingsData);
        console.log(`📊 Portfolio analysis complete. Found ${portfolioBreakdown.consolidatedHoldings.length} unique holdings.`);
      } else {
        console.log('⚠️  Database URL not configured - skipping ETF breakdown analysis');
      }
    } catch (error) {
      console.error('❌ Error analyzing portfolio with database:', error);
    }

    // Return data to the frontend
    return NextResponse.json({
      originalHoldings: holdingsData,
      portfolioBreakdown,
      hasBreakdown: !!portfolioBreakdown
    });
  } catch (error: any) {
    console.error('Plaid Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to exchange token and fetch holdings' }, 
      { status: 400 }
    );
  }
}