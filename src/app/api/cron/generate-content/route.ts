import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';
import crypto from 'crypto';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
    const headersList = headers();
    const cronSecret = headersList.get('x-cron-secret');

    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Fetch recent articles from our database
        const recentArticles = await kv.lrange('scraped_articles', 0, 19);
        
        // Analyze trends and generate content suggestion
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are a legal content expert. Analyze recent legal blog posts and suggest new, unique content."
                },
                {
                    role: "user",
                    content: `Based on these recent articles: ${JSON.stringify(recentArticles)}, suggest a new blog post that would be valuable for legal professionals. Include a title, summary, and detailed outline.`
                }
            ]
        });

        const suggestion = completion.choices[0].message.content;
        
        // Generate an image for the blog post
        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: "Professional, modern image representing legal technology and innovation, suitable for a legal blog",
            n: 1,
            size: "1024x1024",
        });

        const imageUrl = imageResponse.data[0].url;
        
        // Store the suggestion
        const contentId = crypto.randomUUID();
        const contentSuggestion = {
            id: contentId,
            title: JSON.parse(suggestion).title,
            summary: JSON.parse(suggestion).summary,
            content: JSON.parse(suggestion).outline,
            imageUrl,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        await kv.lpush('ai_content_suggestions', JSON.stringify(contentSuggestion));
        
        // Keep only last 30 suggestions
        await kv.ltrim('ai_content_suggestions', 0, 29);

        return NextResponse.json({
            success: true,
            message: 'Content generated successfully',
            suggestion: contentSuggestion
        });
    } catch (error) {
        console.error('Content Generation Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 