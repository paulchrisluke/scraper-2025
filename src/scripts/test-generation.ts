import { scrapeAllBlogs } from '../lib/scrapers';
import { generateBlogPost } from '../lib/ai/openai';
import { db } from '../lib/db';
import * as fs from 'fs/promises';
import * as path from 'path';

async function testGeneration() {
  try {
    console.log('Starting AI content generation test...');

    // First get some source material
    const posts = await scrapeAllBlogs();
    console.log(`Scraped ${posts.length} posts for source material`);

    // Take 3 random posts as source material
    const sourcePosts = posts
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    console.log('\nGenerating new blog post...');
    const generatedPost = await generateBlogPost(sourcePosts);

    // Save to database
    await db.saveGeneratedPost(generatedPost);

    // Save to file for inspection
    const outputDir = path.join(process.cwd(), 'test-output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `generated_${generatedPost.id}.md`);
    await fs.writeFile(outputPath, `
# ${generatedPost.title}

${generatedPost.summary}

![Generated Image](${generatedPost.imageUrl})

${generatedPost.content}

---
Generated from:
${generatedPost.sourceReferences.map(url => `- ${url}`).join('\n')}
    `.trim());

    console.log(`\nGeneration complete!`);
    console.log('Title:', generatedPost.title);
    console.log('Summary:', generatedPost.summary);
    console.log('Image URL:', generatedPost.imageUrl);
    console.log(`Full content saved to: ${outputPath}`);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGeneration(); 