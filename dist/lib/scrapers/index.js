import { scrapeClioBlog } from './clio.js';
import { scrapeMyCaseBlog } from './mycase.js';
import { scrapeLawPayBlog } from './lawpay.js';
export async function scrapeAllBlogs() {
    const posts = [];
    try {
        // Run scrapers in parallel
        const [clioPosts, myCasePosts, lawPayPosts] = await Promise.all([
            scrapeClioBlog().catch(error => {
                console.error('Error scraping Clio blog:', error);
                return [];
            }),
            scrapeMyCaseBlog().catch(error => {
                console.error('Error scraping MyCase blog:', error);
                return [];
            }),
            scrapeLawPayBlog().catch(error => {
                console.error('Error scraping LawPay blog:', error);
                return [];
            })
        ]);
        posts.push(...clioPosts, ...myCasePosts, ...lawPayPosts);
        console.log('\nScraping Summary:');
        console.log(`Clio: ${clioPosts.length} posts`);
        console.log(`MyCase: ${myCasePosts.length} posts`);
        console.log(`LawPay: ${lawPayPosts.length} posts`);
        console.log(`Total: ${posts.length} posts\n`);
        return posts;
    }
    catch (error) {
        console.error('Error scraping blogs:', error);
        return posts;
    }
}
// Testing all scrapers
async function test() {
    try {
        const posts = await scrapeAllBlogs();
        console.log('All scrapers completed');
        console.log(`Total posts: ${posts.length}`);
    }
    catch (error) {
        console.error('Test failed:', error);
    }
}
// Run test if file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
    test();
}
