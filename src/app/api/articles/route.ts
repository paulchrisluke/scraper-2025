import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'edge';

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

    // Get all article IDs sorted by date
    const articleIds = await kv.zrange('articles_by_date', 0, -1);
    
    // Get all articles
    const articles = await Promise.all(
      articleIds.map(async (id) => {
        return await kv.get(`article:${id}`);
      })
    );

    return new NextResponse(JSON.stringify({ 
      success: true,
      data: articles 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return new NextResponse(JSON.stringify({ 
      success: false,
      error: 'Failed to fetch articles' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 