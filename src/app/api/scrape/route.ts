import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { SCRAPING_CONFIG } from '@/lib/scraping/config';
import { updateProgress, getProgress, logError } from '@/lib/scraping/progress';
import crypto from 'crypto';

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeArticles(siteId: string) {
    console.log(`Starting scrape for ${siteId}`);
    const site = SCRAPING_CONFIG.sites[siteId];
    const progress = await getProgress(siteId);
    
    let browser;
    try {
        // Start from the last page we were on, or the first page
        const startUrl = progress.nextPageUrl || site.baseUrl;
        console.log(`Launching browser for ${startUrl}`);
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setUserAgent(SCRAPING_CONFIG.headers['User-Agent']);
        
        // Set other headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': SCRAPING_CONFIG.headers['Accept-Language'],
            'Accept': SCRAPING_CONFIG.headers['Accept']
        });
        
        console.log(`Navigating to ${startUrl}`);
        await page.goto(startUrl, { 
            waitUntil: ['networkidle0', 'domcontentloaded'],
            timeout: 30000 
        });
        
        // Wait for the main content to load
        await page.waitForSelector(site.articleSelector, { 
            timeout: 20000,
            visible: true 
        }).catch(() => console.log(`Timeout waiting for ${site.articleSelector}`));
        
        // Additional wait to ensure dynamic content loads
        await page.waitForTimeout(2000);
        
        // Get the rendered HTML
        const html = await page.content();
        
        // Debug: Save the HTML for inspection
        await kv.set(`debug:html:${siteId}`, html.slice(0, 50000));
        
        const $ = cheerio.load(html);
        
        // Debug: Log the first 1000 characters of HTML
        console.log(`First 1000 chars of HTML for ${siteId}:`, html.slice(0, 1000));
        
        // Count total articles if we haven't yet
        if (!progress.totalArticles) {
            const totalPages = $(site.paginationSelector).length;
            const articlesPerPage = $(site.articleSelector).length;
            const estimatedTotal = totalPages * articlesPerPage || 10;
            console.log(`Estimated total articles for ${siteId}: ${estimatedTotal}`);
            await updateProgress({
                siteId,
                totalArticles: estimatedTotal
            });
        }
        
        // Log selectors being used
        console.log(`Using selectors for ${siteId}:`, {
            articleSelector: site.articleSelector,
            titleSelector: site.titleSelector,
            dateSelector: site.dateSelector,
            contentSelector: site.contentSelector
        });

        // Debug: Log all found elements
        console.log(`Found elements for ${siteId}:`, {
            articles: $(site.articleSelector).length,
            titles: $(site.titleSelector).length,
            dates: $(site.dateSelector).length,
            contents: $(site.contentSelector).length
        });

        // Count articles found on page
        const totalArticlesOnPage = $(site.articleSelector).length;
        console.log(`Found ${totalArticlesOnPage} articles on page`);
        
        if (totalArticlesOnPage === 0) {
            console.log('HTML structure around where articles should be:');
            $('main, #main, .main, #content, .content').each((i, el) => {
                console.log(`Main content area ${i + 1}:`, $(el).html()?.slice(0, 500));
            });
        }
        
        // Get all article URLs first
        const articleUrls = new Set();
        $(site.articleSelector).each((_, el) => {
            const href = $(el).attr('href') || $(el).find('a').first().attr('href');
            if (href) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, site.baseUrl).toString();
                if (fullUrl.includes('/blog/') && !fullUrl.includes('/category/') && !fullUrl.includes('/tag/')) {
                    articleUrls.add(fullUrl);
                }
            }
        });
        
        console.log(`Found ${articleUrls.size} article URLs`);
        
        // Scrape articles from current page
        const articles = [];
        for (const url of Array.from(articleUrls).slice(0, SCRAPING_CONFIG.batchSize)) {
            try {
                console.log(`Navigating to article: ${url}`);
                await page.goto(url, { 
                    waitUntil: ['networkidle0', 'domcontentloaded'],
                    timeout: 30000 
                });
                
                // Wait for article content
                await page.waitForSelector(site.titleSelector, { 
                    timeout: 20000,
                    visible: true 
                });
                
                const articleHtml = await page.content();
                const $article = cheerio.load(articleHtml);
                
                const title = $article(site.titleSelector).first().text().trim();
                const date = $article(site.dateSelector).attr('content') || 
                           $article(site.dateSelector).text().trim() ||
                           new Date().toISOString();
                           
                let content = '';
                if (site.contentSelector) {
                    content = $article(site.contentSelector)
                        .map((_, el) => $article(el).text().trim())
                        .get()
                        .filter(text => text && text.length > 10)
                        .join('\n\n');
                }
                
                console.log(`Scraped article: "${title}" (${date})`);
                
                if (title && content) {
                    articles.push({
                        id: crypto.randomUUID(),
                        title,
                        url,
                        date,
                        content,
                        site: siteId
                    });
                }
                
                await page.waitForTimeout(SCRAPING_CONFIG.delays.betweenPages);
            } catch (error) {
                console.error(`Error processing article at ${url}:`, error);
            }
        }
        
        console.log(`Successfully scraped ${articles.length} articles`);
        
        // Store articles
        for (const article of articles) {
            await kv.lpush(`articles:${siteId}`, JSON.stringify(article));
            console.log(`Stored article: ${article.title}`);
        }
        
        // Find next page URL
        const nextPageUrl = $(site.paginationSelector)
            .filter((_, el) => $(el).text().includes('Next'))
            .attr('href');
        
        console.log(`Next page URL: ${nextPageUrl || 'None'}`);
        
        // Update progress
        await updateProgress({
            siteId,
            scrapedArticles: progress.scrapedArticles + articles.length,
            lastScrapedUrl: startUrl,
            lastScrapedDate: new Date().toISOString(),
            nextPageUrl: nextPageUrl || null,
            isComplete: !nextPageUrl
        });
        
        return articles;
    } catch (error) {
        console.error(`Error scraping ${siteId}:`, error);
        await logError(siteId, error.message);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}

export async function GET(request: Request) {
    console.log('Scraping endpoint called');
    const headersList = headers();
    const apiKey = headersList.get('x-api-key');
    
    console.log('Checking API key:', apiKey?.slice(0, 8) + '...');
    console.log('Expected API key:', process.env.SCRAPE_API_KEY?.slice(0, 8) + '...');

    if (!apiKey || apiKey !== process.env.SCRAPE_API_KEY) {
        console.error('Unauthorized access attempt');
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const results = {};
        const sites = Object.keys(SCRAPING_CONFIG.sites);
        
        console.log(`Starting scrape for sites: ${sites.join(', ')}`);
        
        for (const site of sites) {
            try {
                console.log(`Processing site: ${site}`);
                results[site] = await scrapeArticles(site);
                console.log(`Completed scraping for ${site}`);
                // Respect rate limits between sites
                await delay(SCRAPING_CONFIG.delays.betweenSites);
            } catch (error) {
                console.error(`Error processing ${site}:`, error);
                results[site] = { error: error.message };
            }
        }

        console.log('Scraping completed successfully');
        return NextResponse.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Fatal scraping error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
} 