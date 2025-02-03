import { getSlugFromUrl } from '../utils/slug';
import { chromium } from 'playwright';
export async function scrapeMyCaseBlog() {
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
        console.log('Starting MyCase blog scrape...');
        const posts = [];
        // Start with the blog index page
        await page.goto('https://www.mycase.com/blog/', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        // Handle cookie consent dialog
        try {
            console.log('Looking for cookie consent dialog...');
            const dialogSelector = '.osano-cm-window';
            await page.waitForSelector(dialogSelector, { timeout: 5000 });
            console.log('Found cookie dialog');
            const acceptButton = await page.waitForSelector('.osano-cm-accept-all', { timeout: 5000 });
            if (acceptButton) {
                console.log('Found accept button, clicking...');
                await acceptButton.click();
                await page.waitForTimeout(2000);
                // Wait for dialog to disappear
                await page.waitForSelector(dialogSelector, { state: 'hidden', timeout: 5000 });
                console.log('Cookie dialog closed');
            }
        }
        catch (error) {
            console.log('No cookie consent dialog found or could not interact with it:', error.message);
        }
        console.log('Blog index page loaded, gathering article links...');
        // Get all article links from the blog index
        const articleLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href*="/blog/"]'))
                .map(link => link.getAttribute('href'))
                .filter((href) => href !== null &&
                href.includes('/blog/') &&
                !href.endsWith('/blog/') &&
                !href.includes('/category/') &&
                !href.includes('/tag/') &&
                !href.includes('/author/'));
        });
        console.log(`Found ${articleLinks.length} article links`);
        // Process each article
        for (const url of articleLinks.slice(0, 5)) { // Limit to 5 articles for testing
            try {
                console.log(`Processing article at ${url}`);
                await page.goto(url, {
                    waitUntil: 'networkidle',
                    timeout: 30000
                });
                // Wait for any content to be visible
                console.log('Waiting for content...');
                await page.waitForTimeout(5000); // Give the page time to fully render
                const data = await page.evaluate(() => {
                    // Try to find the title
                    const titleSelectors = ['h1', '.post-title', '.entry-title', '.blog-title h1', 'article h1'];
                    let title = null;
                    for (const selector of titleSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            title = element.textContent?.trim();
                            if (title)
                                break;
                        }
                    }
                    // Try to find the date
                    const dateSelectors = ['.post-date', '.published-date', 'time', '.entry-date', '.date'];
                    let dateStr = null;
                    for (const selector of dateSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            dateStr = element.textContent?.trim();
                            if (dateStr)
                                break;
                        }
                    }
                    // Try to find the content
                    const contentSelectors = [
                        '.post-content p',
                        '.entry-content p',
                        '.blog-content p',
                        'article p',
                        '.post p',
                        'main p'
                    ];
                    let content = '';
                    for (const selector of contentSelectors) {
                        const paragraphs = Array.from(document.querySelectorAll(selector))
                            .map(p => p.textContent?.trim())
                            .filter(text => text);
                        if (paragraphs.length > 0) {
                            content = paragraphs.join('\n\n');
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
                        source: 'mycase',
                        createdAt: now,
                        updatedAt: now
                    });
                    console.log(`Successfully processed: ${data.title}`);
                }
                // Add a small delay between requests
                await page.waitForTimeout(2000);
            }
            catch (error) {
                console.error(`Failed to process article at ${url}:`, error);
            }
        }
        console.log(`Successfully scraped ${posts.length} posts from MyCase`);
        return posts;
    }
    catch (error) {
        console.error('Error scraping MyCase blog:', error);
        throw error;
    }
    finally {
        await browser.close();
    }
}
// Testing the scraper directly
async function test() {
    try {
        const posts = await scrapeMyCaseBlog();
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
