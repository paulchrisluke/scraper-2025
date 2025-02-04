import { NextResponse } from 'next/server';
import { scrapeAndStore } from '@/lib/scrapers';

export const runtime = 'edge';
export const maxDuration = 300;

// This endpoint will be called by Vercel Cron
export async function GET(request: Request) {
  try {
    // Verify cron secret to ensure the request is from Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const articles = await scrapeAndStore();
    
    return new NextResponse(JSON.stringify({ 
      success: true,
      message: 'Scheduled scraping completed',
      articlesCount: articles.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Scheduled scraping error:', error);
    return new NextResponse(JSON.stringify({ 
      success: false,
      error: 'Failed to run scheduled scraping' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 