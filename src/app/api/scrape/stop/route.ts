import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
    try {
        const headersList = headers();
        const apiKey = headersList.get('x-api-key');
        
        if (!apiKey || apiKey !== process.env.SCRAPE_API_KEY) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Set a flag in KV to stop the scraping
        await kv.set('scraping:stop', true);
        
        return NextResponse.json({ 
            success: true,
            message: 'Scraping stop signal sent'
        });
    } catch (error) {
        console.error('Error stopping scrape:', error);
        return NextResponse.json({ 
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
} 