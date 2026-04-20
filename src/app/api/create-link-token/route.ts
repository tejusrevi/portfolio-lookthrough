import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { 
  LinkTokenCreateRequest, 
  LinkTokenCreateRequestUser, 
  Products, 
  CountryCode 
} from 'plaid';

export async function POST(request: NextRequest) {
  try {
    const linkTokenCreateRequest: LinkTokenCreateRequest = {
      products: [Products.Investments],
      client_name: 'Portfolio Tracker App',
      country_codes: [CountryCode.Us, CountryCode.Ca],
      language: 'en',
      user: {
        client_user_id: 'unique-user-id-from-your-db'
      } as LinkTokenCreateRequestUser,
    };

    const response = await plaidClient.linkTokenCreate(linkTokenCreateRequest);
    
    return NextResponse.json({ 
      link_token: response.data.link_token 
    });
  } catch (error: any) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create link token' }, 
      { status: 400 }
    );
  }
}