import { Feed } from 'feed';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';
import { Article } from '@/types/article';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: Request) {
  const headersList = headers();
  const apiKey = headersList.get('x-api-key');
  
  if (!apiKey || apiKey !== process.env.RSS_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Get latest articles from KV store
    const articles = await kv.zrange('articles', 0, 19, { rev: true }) as Article[];
    
    if (!articles || articles.length === 0) {
      return new NextResponse('No articles found', { status: 404 });
    }

    const feed = new Feed({
      title: "Legal Tech Blog Feed",
      description: "Latest articles from leading legal tech platforms",
      id: "https://blawby.com/",
      link: "https://blawby.com/",
      language: "en",
      image: "https://blawby.com/logo.png",
      favicon: "https://blawby.com/favicon.ico",
      copyright: "All rights reserved 2024, Blawby",
      updated: new Date(),
      generator: "Legal Tech Blog Feed Generator",
      feedLinks: {
        rss2: "https://blawby.com/rss",
        json: "https://blawby.com/json",
        atom: "https://blawby.com/atom"
      },
      author: {
        name: "Blawby",
        email: "hello@blawby.com",
        link: "https://blawby.com"
      }
    });

    articles.forEach(article => {
      feed.addItem({
        title: article.title,
        id: article.id,
        link: article.url,
        description: article.summary,
        content: article.content,
        author: [
          {
            name: "Legal Tech Insights",
            email: "hello@blawby.com",
            link: "https://blawby.com"
          }
        ],
        date: new Date(article.publishedAt),
        image: article.imageUrl
      });
    });

    // Return the feed in the requested format
    const accept = headersList.get('accept');
    
    if (accept?.includes('application/atom+xml')) {
      return new NextResponse(feed.atom1(), {
        headers: { 'Content-Type': 'application/atom+xml' }
      });
    }
    
    if (accept?.includes('application/json')) {
      return new NextResponse(feed.json1(), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Default to RSS 2.0
    return new NextResponse(feed.rss2(), {
      headers: { 'Content-Type': 'application/rss+xml' }
    });
  } catch (error) {
    console.error('Error generating feed:', error);
    return new NextResponse('Error generating feed', { status: 500 });
  }
} 