import { scrapeAllBlogs } from '../lib/scrapers';
import { db } from '../lib/db';
async function runTests() {
    try {
        // Initialize database
        await db.initializeDatabase();
        console.log('Database initialized');
        // Run scraping
        console.log('\n=== Starting Scraper Tests ===\n');
        const posts = await scrapeAllBlogs();
        // Print results
        console.log('\n=== Results ===');
        console.log(`Total posts scraped: ${posts.length}`);
        // Group by source
        const bySource = posts.reduce((acc, post) => {
            acc[post.source] = (acc[post.source] || 0) + 1;
            return acc;
        }, {});
        Object.entries(bySource).forEach(([source, count]) => {
            console.log(`${source}: ${count} posts`);
        });
        // Sample post details
        if (posts.length > 0) {
            console.log('\n=== Sample Post ===');
            const sample = posts[0];
            console.log({
                title: sample.title,
                url: sample.url,
                publishedAt: sample.publishedAt,
                contentPreview: sample.content.slice(0, 100) + '...',
                source: sample.source
            });
        }
    }
    catch (error) {
        console.error('Test failed:', error);
    }
}
runTests();
