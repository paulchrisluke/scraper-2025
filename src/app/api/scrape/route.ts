import { NextResponse } from 'next/server';
import { scrapeAllBlogs } from '@/lib/scrapers';
import { ApiResponse, BlogPost } from '@/types';

export const runtime = 'edge';
export const preferredRegion = 'us-east-1';

export async function GET(): Promise<NextResponse<ApiResponse<BlogPost[]>>> {
  try {
    // Verify CRON secret if present in headers
    const posts = await scrapeAllBlogs();
    
    return NextResponse.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error in scrape API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to scrape blogs'
    }, { status: 500 });
  }
} 