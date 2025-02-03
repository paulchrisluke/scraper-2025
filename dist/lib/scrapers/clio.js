import { getSlugFromUrl } from '../utils/slug';
import { chromium } from 'playwright';
export async function scrapeClioBlog() {
    const browser = await chromium.launch({
        headless: false // Try with visible browser for debugging
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();
    try {
        console.log('Starting Clio blog scrape...');
        const posts = [];
        // Start with a known blog post URL
        const startUrl = 'https://www.clio.com/blog/legal-practice-management-software/';
        await page.goto(startUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        console.log('Initial page loaded, processing content...');
        // Process the initial post
        const initialData = await page.evaluate(() => {
            function getContent(selectors) {
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent?.trim();
                    }
                }
                return null;
            }
            const title = getContent(['h1', '.post-title', '.entry-title']);
            const dateStr = getContent(['.post-date', '.published-date', 'time', '.entry-date']);
            // Get content from article body
            const contentSelectors = ['.post-content', '.entry-content', 'article', '.article-body'];
            let content = '';
            for (const selector of contentSelectors) {
                const container = document.querySelector(selector);
                if (container) {
                    content = Array.from(container.querySelectorAll('p, h2, h3, h4, h5, h6, ul, ol'))
                        .map(el => el.textContent?.trim())
                        .filter(text => text)
                        .join('\n\n');
                    if (content)
                        break;
                }
            }
            const summary = document.querySelector('meta[name="description"]')?.getAttribute('content');
            const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
            // Find related post links
            const relatedLinks = Array.from(document.querySelectorAll('a[href*="/blog/"]'))
                .map(link => link.getAttribute('href'))
                .filter(href => href &&
                href.includes('/blog/') &&
                !href.endsWith('/blog/') &&
                !href.includes('/category/') &&
                !href.includes('/tag/') &&
                !href.includes('/author/') &&
                !href.includes('#') &&
                !href.includes('?'));
            return { title, dateStr, content, summary, imageUrl, relatedLinks };
        });
        if (initialData.title && initialData.content) {
            const id = getSlugFromUrl(startUrl);
            const now = new Date();
            const publishedAt = initialData.dateStr ? new Date(initialData.dateStr) : now;
            posts.push({
                id,
                title: initialData.title,
                content: initialData.content,
                summary: initialData.summary || '',
                url: startUrl,
                imageUrl: initialData.imageUrl || '',
                publishedAt,
                source: 'clio',
                createdAt: now,
                updatedAt: now
            });
            console.log(`Successfully processed initial post: ${initialData.title}`);
            // Process related posts
            const relatedUrls = initialData.relatedLinks
                .map(href => href.startsWith('http') ? href : `https://www.clio.com${href}`)
                .slice(0, 4); // Process up to 4 related posts for testing
            for (const url of relatedUrls) {
                try {
                    console.log(`Processing related article at ${url}`);
                    await page.goto(url, {
                        waitUntil: 'domcontentloaded',
                        timeout: 30000
                    });
                    // Wait a bit for dynamic content
                    await page.waitForTimeout(2000);
                    const data = await page.evaluate(() => {
                        function getContent(selectors) {
                            for (const selector of selectors) {
                                const element = document.querySelector(selector);
                                if (element) {
                                    return element.textContent?.trim();
                                }
                            }
                            return null;
                        }
                        const title = getContent(['h1', '.post-title', '.entry-title']);
                        const dateStr = getContent(['.post-date', '.published-date', 'time', '.entry-date']);
                        // Get content from article body
                        const contentSelectors = ['.post-content', '.entry-content', 'article', '.article-body'];
                        let content = '';
                        for (const selector of contentSelectors) {
                            const container = document.querySelector(selector);
                            if (container) {
                                content = Array.from(container.querySelectorAll('p, h2, h3, h4, h5, h6, ul, ol'))
                                    .map(el => el.textContent?.trim())
                                    .filter(text => text)
                                    .join('\n\n');
                                if (content)
                                    break;
                            }
                        }
                        const summary = document.querySelector('meta[name="description"]')?.getAttribute('content');
                        const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
                        return { title, dateStr, content, summary, imageUrl };
                    });
                    if (data.title && data.content) {
                        const id = getSlugFromUrl(url);
                        const now = new Date();
                        const publishedAt = data.dateStr ? new Date(data.dateStr) : now;
                        posts.push({
                            id,
                            title: data.title,
                            content: data.content,
                            summary: data.summary || '',
                            url,
                            imageUrl: data.imageUrl || '',
                            publishedAt,
                            source: 'clio',
                            createdAt: now,
                            updatedAt: now
                        });
                        console.log(`Successfully processed: ${data.title}`);
                    }
                }
                catch (error) {
                    console.error(`Failed to process article at ${url}:`, error);
                }
                // Add a small delay between requests
                await page.waitForTimeout(2000);
            }
        }
        console.log(`Successfully scraped ${posts.length} posts from Clio`);
        return posts;
    }
    catch (error) {
        console.error('Error scraping Clio blog:', error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
// Testing the scraper directly
async function test() {
    try {
        const posts = await scrapeClioBlog();
        console.log(`Found ${posts.length} posts`);
        if (posts.length > 0) {
            console.log('Sample post:', JSON.stringify(posts[0], null, 2));
        }
    }
    catch (error) {
        console.error('Test failed:', error);
    }
}
// Run test if file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
    test();
}
