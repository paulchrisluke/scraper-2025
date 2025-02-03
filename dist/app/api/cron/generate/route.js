import { NextResponse } from 'next/server';
import { scrapeAllBlogs } from '@/lib/scrapers';
import { generateBlogPost } from '@/lib/ai/openai';
import { db } from '@/lib/db';
export const runtime = 'edge';
export const preferredRegion = 'us-east-1';
export async function GET(request) {
    try {
        // Verify CRON secret
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 });
        }
        // First scrape new content
        console.log('Starting CRON job: Scraping blogs...');
        await scrapeAllBlogs();
        // Get all posts from database
        const posts = await db.getAllPosts();
        if (posts.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No source posts available'
            }, { status: 400 });
        }
        // Generate new post
        console.log('Generating new blog post...');
        const generatedPost = await generateBlogPost(posts);
        // Save generated post
        await db.saveGeneratedPost(generatedPost);
        console.log('CRON job completed successfully');
        return NextResponse.json({
            success: true,
            data: generatedPost
        });
    }
    catch (error) {
        console.error('Error in CRON job:', error);
        return NextResponse.json({
            success: false,
            error: 'CRON job failed'
        }, { status: 500 });
    }
}
