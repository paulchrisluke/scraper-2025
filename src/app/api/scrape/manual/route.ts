import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { validateApiKey } from '@/lib/auth';
import { scrapeClioBlog } from '@/lib/scrapers/clio';
import { scrapeLawPayBlog } from '@/lib/scrapers/lawpay';
import { storeArticle } from '@/lib/storage';
import { Article } from '@/types/article';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const requestSchema = z.object({
  source: z.enum(['clio', 'mycase', 'lawpay']).optional(),
  limit: z.number().min(1).max(20).optional()
});

export async function POST(request: Request) {
  // Validate API key
  const authError = await validateApiKey('GENERATE_API_KEY');
  if (authError) return authError;

  try {
    const body = await request.json();
    const { source, limit = 5 } = requestSchema.parse(body);
    const results: Article[] = [];

    // Scrape selected source or all sources
    if (!source || source === 'clio') {
      console.log('Scraping Clio blog...');
      const clioPosts = await scrapeClioBlog();
      results.push(...clioPosts.slice(0, limit));
    }

    if (!source || source === 'lawpay') {
      console.log('Scraping LawPay blog...');
      const lawpayPosts = await scrapeLawPayBlog();
      results.push(...lawpayPosts.slice(0, limit));
    }

    // Store results
    for (const article of results) {
      await storeArticle(article);
    }

    return new NextResponse(JSON.stringify({
      message: 'Manual scrape completed',
      articlesScraped: results.length,
      articles: results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in manual scrape:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify({
        message: 'Invalid request body',
        errors: error.errors
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new NextResponse('Error running manual scrape', { status: 500 });
  }
} 