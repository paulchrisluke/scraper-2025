import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';
import puppeteer from 'puppeteer';
import { Article } from '@/types/article';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Helper function to get slug from URL
function getSlugFromUrl(url: string): string {
  return url.split('/').filter(Boolean).pop() || '';
}

export async function GET(request: Request) {
  const headersList = headers();
  const cronSecret = headersList.get('x-cron-secret');
  
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox']
    });

    const results: Article[] = [];

    // Scrape Clio blog
    try {
      const page = await browser.newPage();
      await page.goto('https://www.clio.com/blog/', { waitUntil: 'networkidle0' });
      
      const articles = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/blog/"]'))
          .map(a => a.href)
          .filter(href => !href.includes('/blog/page/') && !href.includes('/blog/category/'))
          .slice(0, 5); // Get latest 5 articles
        return links;
      });

      for (const url of articles) {
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        const data = await page.evaluate(() => {
          const title = document.querySelector('h1')?.textContent?.trim();
          const content = Array.from(document.querySelectorAll('article p'))
            .map(p => p.textContent?.trim())
            .filter(Boolean)
            .join('\n\n');
          const dateStr = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
          const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
          const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
          
          return { title, content, dateStr, metaDescription, imageUrl };
        });

        if (data.title && data.content) {
          const id = getSlugFromUrl(url);
          const now = new Date();
          const publishedAt = data.dateStr ? new Date(data.dateStr) : now;

          results.push({
            id,
            title: data.title,
            content: data.content,
            summary: data.metaDescription || '',
            url,
            imageUrl: data.imageUrl || '',
            publishedAt,
            source: 'clio' as const,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    } catch (error) {
      console.error('Error scraping Clio:', error);
    }

    // Scrape MyCase blog
    try {
      const page = await browser.newPage();
      await page.goto('https://www.mycase.com/blog/', { waitUntil: 'networkidle0' });
      
      const articles = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/blog/"]'))
          .map(a => a.href)
          .filter(href => !href.includes('/blog/page/') && !href.includes('/blog/category/'))
          .slice(0, 5);
        return links;
      });

      for (const url of articles) {
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        const data = await page.evaluate(() => {
          const title = document.querySelector('div.px-4 h1')?.textContent?.trim();
          const content = Array.from(document.querySelectorAll('div.markdown p'))
            .map(p => p.textContent?.trim())
            .filter(Boolean)
            .join('\n\n');
          const dateStr = document.querySelector('div.ml-4 > div.font-bold.text-xs')?.textContent?.trim();
          const author = document.querySelector('div.ml-4 > div.font-light.text-sm')?.textContent?.trim();
          const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
          const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
          
          return { title, content, dateStr, author, metaDescription, imageUrl };
        });

        if (data.title && data.content) {
          const id = getSlugFromUrl(url);
          const now = new Date();
          const publishedAt = data.dateStr ? new Date(data.dateStr) : now;

          results.push({
            id,
            title: data.title,
            content: data.content,
            summary: data.metaDescription || '',
            url,
            imageUrl: data.imageUrl || '',
            publishedAt,
            source: 'mycase' as const,
            author: data.author,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    } catch (error) {
      console.error('Error scraping MyCase:', error);
    }

    // Scrape LawPay blog
    try {
      const page = await browser.newPage();
      await page.goto('https://www.lawpay.com/about/blog/', { waitUntil: 'networkidle0' });
      
      const articles = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/blog/"]'))
          .map(a => a.href)
          .filter(href => !href.includes('/blog/page/') && !href.includes('/blog/category/'))
          .slice(0, 5);
        return links;
      });

      for (const url of articles) {
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        const data = await page.evaluate(() => {
          const title = document.querySelector('h1')?.textContent?.trim();
          const content = Array.from(document.querySelectorAll('article p'))
            .map(p => p.textContent?.trim())
            .filter(Boolean)
            .join('\n\n');
          const dateStr = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
          const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
          const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
          
          return { title, content, dateStr, metaDescription, imageUrl };
        });

        if (data.title && data.content) {
          const id = getSlugFromUrl(url);
          const now = new Date();
          const publishedAt = data.dateStr ? new Date(data.dateStr) : now;

          results.push({
            id,
            title: data.title,
            content: data.content,
            summary: data.metaDescription || '',
            url,
            imageUrl: data.imageUrl || '',
            publishedAt,
            source: 'lawpay' as const,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    } catch (error) {
      console.error('Error scraping LawPay:', error);
    }

    await browser.close();

    // Store results in KV store
    for (const article of results) {
      await kv.zadd('articles', {
        score: new Date(article.publishedAt).getTime(),
        member: article
      });
    }

    return new NextResponse(JSON.stringify({
      message: 'Scraping completed',
      articlesScraped: results.length
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    return new NextResponse('Error in cron job', { status: 500 });
  }
} 