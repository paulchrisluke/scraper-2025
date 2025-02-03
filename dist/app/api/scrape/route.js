import { NextResponse } from 'next/server';
import { scrapeAllBlogs } from '@/lib/scrapers';
export const runtime = 'edge';
export const preferredRegion = 'us-east-1';
export async function GET() {
    try {
        // Verify CRON secret if present in headers
        const posts = await scrapeAllBlogs();
        return NextResponse.json({
            success: true,
            data: posts
        });
    }
    catch (error) {
        console.error('Error in scrape API:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to scrape blogs'
        }, { status: 500 });
    }
}
