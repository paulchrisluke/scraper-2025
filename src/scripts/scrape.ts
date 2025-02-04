import { scrapeClioBlog } from '../lib/scrapers/clio';
import { scrapeMyCaseBlog } from '../lib/scrapers/mycase';
import { scrapeLawPayBlog } from '../lib/scrapers/lawpay';
import { db } from '../lib/db/schema';

async function scrapeSite(site: string) {
    try {
        // Set scraping status
        await db.scraping.setStatus(site, 'scraping');
        
        let articles = [];
        const startTime = Date.now();
        
        switch (site) {
            case 'clio':
                articles = await scrapeClioBlog(1, 10); // Scrape up to 10 pages
                break;
            case 'mycase':
                articles = await scrapeMyCaseBlog();
                break;
            case 'lawpay':
                articles = await scrapeLawPayBlog();
                break;
            default:
                throw new Error(`Unknown site: ${site}`);
        }

        // Store articles and update metadata
        console.log(`\nStoring ${articles.length} articles from ${site}...`);
        for (const article of articles) {
            await db.articles.add(article);
            console.log(`Stored article: ${article.title}`);
        }

        // Update site metadata
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        await db.sites.updateMetadata(site, {
            lastScraped: new Date().toISOString(),
            scrapingStats: {
                successRate: 100,
                averageArticlesPerScrape: articles.length,
                lastSuccessfulScrape: new Date().toISOString(),
                errors: { count: 0 }
            }
        });

        // Set status back to idle
        await db.scraping.setStatus(site, 'idle');
        
        return articles;
    } catch (error) {
        console.error(`Error scraping ${site}:`, error);
        await db.scraping.logError(site, error instanceof Error ? error : new Error(String(error)));
        await db.scraping.setStatus(site, 'error');
        return [];
    }
}

async function main() {
    const site = process.argv[2];
    const isContinuous = process.argv.includes('--continuous');
    
    try {
        if (!site || !['clio', 'mycase', 'lawpay', 'all'].includes(site)) {
            console.error('Please specify a site: clio, mycase, lawpay, or all');
            process.exit(1);
        }

        console.log(`Starting scrape for ${site}${isContinuous ? ' in continuous mode' : ''}...`);
        
        async function scrapeAll() {
            if (site === 'all') {
                const sites = ['clio', 'mycase', 'lawpay'];
                for (const s of sites) {
                    await scrapeSite(s);
                }
            } else {
                await scrapeSite(site);
            }
        }

        if (isContinuous) {
            // Run continuously with a 1-hour interval
            while (true) {
                await scrapeAll();
                console.log('\nWaiting 1 hour before next scrape...');
                await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
            }
        } else {
            await scrapeAll();
            console.log('\nScraping completed successfully!');
            process.exit(0);
        }
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main(); 