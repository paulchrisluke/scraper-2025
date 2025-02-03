import { scrapeClioBlog } from '../lib/scrapers/clio';
import { scrapeMyCaseBlog } from '../lib/scrapers/mycase';
import { scrapeLawPayBlog } from '../lib/scrapers/lawpay';
import * as fs from 'fs/promises';
import * as path from 'path';
async function testContentScraping() {
    try {
        console.log('=== Testing Content Scraping ===\n');
        // Create output directory for content inspection
        const outputDir = path.join(process.cwd(), 'test-output');
        await fs.mkdir(outputDir, { recursive: true });
        const sources = [
            { name: 'CLIO', scraper: scrapeClioBlog },
            { name: 'MYCASE', scraper: scrapeMyCaseBlog },
            { name: 'LAWPAY', scraper: scrapeLawPayBlog }
        ];
        for (const source of sources) {
            console.log(`\n=== Testing ${source.name} Scraper ===\n`);
            const posts = await source.scraper();
            if (posts.length > 0) {
                // Take first 3 posts for thorough testing
                const samplesToTest = posts.slice(0, 3);
                for (const [index, sample] of samplesToTest.entries()) {
                    console.log(`\nTesting Post ${index + 1}:`);
                    console.log('Title:', sample.title);
                    console.log('URL:', sample.url);
                    console.log('Published:', sample.publishedAt);
                    // Content analysis
                    const paragraphs = sample.content.split('\n\n');
                    const words = sample.content.split(/\s+/);
                    console.log('\nContent Analysis:');
                    console.log(`- Paragraphs: ${paragraphs.length}`);
                    console.log(`- Words: ${words.length}`);
                    console.log(`- Characters: ${sample.content.length}`);
                    console.log('- First paragraph:', paragraphs[0]);
                    console.log('- Last paragraph:', paragraphs[paragraphs.length - 1]);
                    // Save full content for inspection
                    const filename = path.join(outputDir, `${source.name.toLowerCase()}_post_${index + 1}.txt`);
                    await fs.writeFile(filename, `
URL: ${sample.url}
TITLE: ${sample.title}
DATE: ${sample.publishedAt}
SUMMARY: ${sample.summary}

CONTENT:
${sample.content}
          `.trim());
                    console.log(`\nFull content saved to: ${filename}`);
                }
            }
            else {
                console.log(`No posts found for ${source.name}`);
            }
            console.log('\n' + '='.repeat(50) + '\n');
        }
    }
    catch (error) {
        console.error('Test failed:', error);
    }
}
testContentScraping();
