import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { kv } from '@vercel/kv';
import * as cheerio from 'cheerio';
import { SCRAPING_CONFIG } from '@/lib/scraping/config';
import { updateProgress, getProgress, logError } from '@/lib/scraping/progress';
import crypto from 'crypto';

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: SCRAPING_CONFIG.headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.text();
        } catch (error) {
            if (i === retries - 1) throw error;
            await delay(1000 * (i + 1)); // Exponential backoff
        }
    }
    throw new Error('Failed to fetch after retries');
}

async function scrapeArticles(siteId: string) {
    console.log(`Starting scrape for ${siteId}`);
    const site = SCRAPING_CONFIG.sites[siteId];
    const progress = await getProgress(siteId);
    
    try {
        // Start from the last page we were on, or the first page
        const startUrl = progress.nextPageUrl || site.baseUrl;
        console.log(`Fetching ${startUrl}`);
        
        // Get the HTML content
        const html = await fetchWithRetry(startUrl);
        
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
                console.log(`Fetching article: ${url}`);
                const articleHtml = await fetchWithRetry(url);
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
                
                await delay(SCRAPING_CONFIG.delays.betweenPages);
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
    }
}

export const runtime = 'edge';
export const preferredRegion = 'iad1';

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