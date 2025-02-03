import OpenAI from 'openai';
import { BlogPost, GeneratedPost } from '@/types';
import { createSlug } from '../utils/slug';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateBlogPost(sourcePosts: BlogPost[]): Promise<GeneratedPost> {
  try {
    console.log('Generating new blog post from source materials...');

    // Create a summary of source materials
    const sourceContext = sourcePosts.map(post => `
Title: ${post.title}
Summary: ${post.summary}
URL: ${post.url}
    `).join('\n\n');

    // Generate title first
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a legal technology expert who writes engaging blog titles."
        },
        {
          role: "user",
          content: `Based on these source materials, generate an engaging title for a new blog post:
          
          ${sourceContext}
          
          The title should be SEO-friendly and appeal to law firm professionals.`
        }
      ]
    });

    const title = titleResponse.choices[0].message.content?.trim() || 'New Legal Tech Blog Post';

    // Generate full content
    const contentResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a legal technology expert who writes comprehensive, engaging blog posts."
        },
        {
          role: "user",
          content: `Write a comprehensive blog post with this title: "${title}"

          Use these source materials for reference:
          ${sourceContext}

          The post should be:
          1. Well-structured with headers
          2. Include practical insights
          3. Be around 1500-2000 words
          4. Include a clear introduction and conclusion
          5. Be written in a professional but engaging tone
          
          Format the post in markdown.`
        }
      ]
    });

    const content = contentResponse.choices[0].message.content?.trim() || '';

    // Generate summary
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Create a concise, engaging summary of this blog post in 2-3 sentences."
        },
        {
          role: "user",
          content: content
        }
      ]
    });

    // Generate an image prompt
    const imagePromptResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Create a detailed image prompt for DALL-E that would make a good featured image for this blog post."
        },
        {
          role: "user",
          content: `Title: ${title}\n\nSummary: ${summaryResponse.choices[0].message.content}`
        }
      ]
    });

    // Generate image using DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePromptResponse.choices[0].message.content || "",
      size: "1792x1024",
      quality: "standard",
      n: 1,
    });

    return {
      id: createSlug(title),
      title,
      content,
      summary: summaryResponse.choices[0].message.content?.trim() || '',
      imageUrl: imageResponse.data[0]?.url || '',
      sourceReferences: sourcePosts.map(p => p.url),
      status: 'pending',
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error generating blog post:', error);
    throw error;
  }
} 