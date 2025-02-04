import { NextResponse } from 'next/server';
import { Feed } from 'feed';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';

export async function GET(request: Request) {
    const headersList = headers();
    const apiKey = headersList.get('x-api-key');

    if (!apiKey || apiKey !== process.env.RSS_API_KEY) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const feed = new Feed({
        title: "Blawby.com AI Content Suggestions",
        description: "AI-generated legal content suggestions based on industry trends",
        id: "https://blawby.com/",
        link: "https://blawby.com/",
        language: "en",
        favicon: "https://blawby.com/favicon.ico",
        copyright: `All rights reserved ${new Date().getFullYear()}`
    });

    try {
        // Fetch the latest AI-generated suggestions from our KV store
        const suggestions = await kv.lrange('ai_content_suggestions', 0, 9);
        
        for (const suggestion of suggestions) {
            const content = JSON.parse(suggestion);
            feed.addItem({
                title: content.title,
                id: content.id,
                link: `https://blawby.com/preview/${content.id}`,
                description: content.summary,
                content: content.content,
                date: new Date(content.createdAt),
                image: content.imageUrl,
            });
        }

        return new NextResponse(feed.rss2(), {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'max-age=0, s-maxage=3600',
            },
        });
    } catch (error) {
        console.error('RSS Feed Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 