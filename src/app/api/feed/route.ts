import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db/schema';
import { Feed } from 'feed';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        // Verify API key
        const headersList = headers();
        const apiKey = headersList.get('x-api-key');
        
        if (!apiKey || apiKey !== process.env.FEED_API_KEY) {
            return NextResponse.json({ 
                success: false,
                error: 'Unauthorized. Please provide a valid API key.'
            }, { status: 401 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const site = searchParams.get('site');
        const format = searchParams.get('format') || 'json';
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        
        // Get recent articles
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days
        
        const articles = site ? 
            await db.articles.getBySite(site, limit) :
            await db.articles.getByDateRange(startDate, new Date(), limit);
        
        if (format === 'rss') {
            const feed = new Feed({
                title: 'Legal Tech Blog Feed',
                description: 'Latest articles from top legal tech blogs',
                id: 'https://blawby.com/',
                link: 'https://blawby.com/',
                language: 'en',
                favicon: 'https://blawby.com/favicon.ico',
                copyright: `All rights reserved ${new Date().getFullYear()}`
            });
            
            articles.forEach(article => {
                feed.addItem({
                    title: article.title,
                    id: article.id,
                    link: article.url,
                    description: article.excerpt,
                    content: article.content,
                    author: [{
                        name: article.author
                    }],
                    date: new Date(article.date),
                    image: article.seo.ogImage
                });
            });
            
            return new NextResponse(feed.rss2(), {
                headers: {
                    'Content-Type': 'application/xml',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        }
        
        // Default JSON response
        return NextResponse.json({
            success: true,
            count: articles.length,
            articles: articles.map(article => ({
                id: article.id,
                title: article.title,
                url: article.url,
                excerpt: article.excerpt,
                author: article.author,
                date: article.date,
                site: article.site,
                metadata: article.metadata,
                seo: article.seo
            }))
        }, {
            headers: {
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        console.error('Feed generation error:', error);
        return NextResponse.json({ 
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
} 