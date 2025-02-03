import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateBlogPost } from '@/lib/ai/openai';
export const runtime = 'edge';
export const preferredRegion = 'us-east-1';
export async function GET() {
    try {
        // Get recent posts from database
        const posts = await db.getAllPosts();
        if (posts.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No source posts available'
            }, { status: 400 });
        }
        // Generate new post using AI
        const generatedPost = await generateBlogPost(posts);
        // Save generated post
        await db.saveGeneratedPost(generatedPost);
        return NextResponse.json({
            success: true,
            data: generatedPost
        });
    }
    catch (error) {
        console.error('Error in generate API:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate blog post'
        }, { status: 500 });
    }
}
