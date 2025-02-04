import { NextResponse } from 'next/server';
import { scrapeAndStore } from '@/lib/scrapers';

export const runtime = 'edge';
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    // Check for API key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.SCRAPE_API_KEY) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const articles = await scrapeAndStore();
    
    return new NextResponse(JSON.stringify({ 
      success: true,
      data: articles 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Scraping error:', error);
    return new NextResponse(JSON.stringify({ 
      success: false,
      error: 'Failed to scrape articles' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 