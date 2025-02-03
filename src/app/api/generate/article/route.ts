import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';
import OpenAI from 'openai';
import { Article, GeneratedArticle } from '@/types/article';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  const headersList = headers();
  const apiKey = headersList.get('x-api-key');
  
  if (!apiKey || apiKey !== process.env.GENERATE_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Get latest articles from KV store
    const articles = await kv.zrange('articles', 0, 19, { rev: true }) as Article[];
    
    if (!articles || articles.length === 0) {
      return new NextResponse('No articles found to generate from', { status: 404 });
    }

    // Select a random article to base the new content on
    const sourceArticle = articles[Math.floor(Math.random() * articles.length)];

    // Generate new content using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert legal technology writer. Your task is to generate a new, unique blog post based on the themes and topics from an existing article, but with a fresh perspective and original content. The new article should be informative, engaging, and optimized for SEO.

Key requirements:
1. Create entirely original content - do not copy from the source
2. Maintain professional legal technology tone
3. Include practical insights and actionable advice
4. Structure content with clear headings and subheadings
5. Optimize for SEO with relevant keywords
6. Keep length between 1000-1500 words`
        },
        {
          role: "user", 
          content: `Source article title: "${sourceArticle.title}"
          
Source article content: "${sourceArticle.content}"

Generate a new article with:
1. Title
2. Summary (150-200 words)
3. Main content (1000-1500 words)

Format the response as JSON with keys: title, summary, content`
        }
      ],
      response_format: { type: "json_object" }
    });

    const generated = JSON.parse(completion.choices[0].message.content || '{}');

    // Generate an image using DALL-E
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a professional, modern image for a legal technology blog post titled: ${generated.title}. The image should be clean, corporate, and suitable for a professional legal audience. Do not include any text in the image.`,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const generatedArticle: GeneratedArticle = {
      ...sourceArticle,
      id: `generated-${Date.now()}`,
      originalArticleId: sourceArticle.id,
      title: generated.title,
      content: generated.content,
      summary: generated.summary,
      aiGeneratedContent: generated.content,
      aiGeneratedTitle: generated.title,
      aiGeneratedSummary: generated.summary,
      aiGeneratedImage: image.data[0].url,
      status: 'pending',
      generatedAt: new Date().toISOString(),
      imageUrl: image.data[0].url,
    };

    // Store the generated article
    await kv.zadd('generated_articles', {
      score: Date.now(),
      member: generatedArticle
    });

    return new NextResponse(JSON.stringify(generatedArticle), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating article:', error);
    return new NextResponse('Error generating article', { status: 500 });
  }
} 