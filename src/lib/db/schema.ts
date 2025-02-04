import { kv } from '@vercel/kv';

// Database key prefixes
const KEY_PREFIXES = {
    ARTICLE: 'article:', // Individual articles
    ARTICLES_BY_SITE: 'articles:by-site:', // Lists of articles by site
    ARTICLES_BY_DATE: 'articles:by-date', // Sorted set of articles by date
    SITE_METADATA: 'site:metadata:', // Site-specific metadata
    SCRAPE_LOG: 'scrape:log:', // Scraping logs
    SCRAPE_STATUS: 'scrape:status:', // Current scraping status
} as const;

// Article interface
export interface Article {
    id: string;
    url: string;
    title: string;
    content: string;
    excerpt: string;
    author: string;
    date: string;
    site: string;
    categories: string[];
    tags: string[];
    metadata: {
        wordCount: number;
        readingTime: number;
        hasImages: boolean;
        imageCount?: number;
    };
    seo: {
        metaTitle?: string;
        metaDescription?: string;
        canonicalUrl?: string;
        ogImage?: string;
    };
    schema: {
        articleType: string;
        articleBody: string;
        datePublished: string;
        dateModified?: string;
        publisher: string;
    };
}

// Site metadata interface
export interface SiteMetadata {
    lastScraped: string;
    totalArticles: number;
    categories: string[];
    authors: string[];
    scrapingStats: {
        successRate: number;
        averageArticlesPerScrape: number;
        lastSuccessfulScrape: string;
        errors: {
            count: number;
            lastError?: string;
            lastErrorDate?: string;
        };
    };
}

// Helper function to check if KV is available
async function isKVAvailable(): Promise<boolean> {
    try {
        await kv.ping();
        return true;
    } catch (error) {
        console.warn('Vercel KV is not available:', error);
        return false;
    }
}

// In-memory fallback storage
const memoryStore = new Map<string, string>();

// Database operations
export const db = {
    // Article operations
    articles: {
        async add(article: Article): Promise<void> {
            try {
                if (await isKVAvailable()) {
                    const pipeline = kv.pipeline();
                    
                    // Store the full article
                    pipeline.set(`${KEY_PREFIXES.ARTICLE}${article.id}`, JSON.stringify(article));
                    
                    // Add to site-specific list
                    pipeline.lpush(
                        `${KEY_PREFIXES.ARTICLES_BY_SITE}${article.site}`,
                        JSON.stringify({ id: article.id, url: article.url, title: article.title })
                    );
                    
                    // Add to date-sorted set
                    pipeline.zadd(KEY_PREFIXES.ARTICLES_BY_DATE, {
                        score: new Date(article.date).getTime(),
                        member: article.id
                    });
                    
                    await pipeline.exec();
                } else {
                    // Fallback to memory storage
                    memoryStore.set(`${KEY_PREFIXES.ARTICLE}${article.id}`, JSON.stringify(article));
                }
            } catch (error) {
                console.error('Error storing article:', error);
                // Fallback to memory storage
                memoryStore.set(`${KEY_PREFIXES.ARTICLE}${article.id}`, JSON.stringify(article));
            }
        },

        async get(id: string): Promise<Article | null> {
            try {
                if (await isKVAvailable()) {
                    const article = await kv.get<string>(`${KEY_PREFIXES.ARTICLE}${id}`);
                    return article ? JSON.parse(article) : null;
                } else {
                    const article = memoryStore.get(`${KEY_PREFIXES.ARTICLE}${id}`);
                    return article ? JSON.parse(article) : null;
                }
            } catch (error) {
                console.error('Error getting article:', error);
                const article = memoryStore.get(`${KEY_PREFIXES.ARTICLE}${id}`);
                return article ? JSON.parse(article) : null;
            }
        },

        async getBySite(site: string, limit = 50, offset = 0): Promise<Article[]> {
            try {
                if (await isKVAvailable()) {
                    const articleIds = await kv.lrange(
                        `${KEY_PREFIXES.ARTICLES_BY_SITE}${site}`,
                        offset,
                        offset + limit - 1
                    );
                    
                    const articles = await Promise.all(
                        articleIds.map(id => this.get(id))
                    );
                    
                    return articles.filter((a): a is Article => a !== null);
                }
                // Fallback: return articles from memory store
                return Array.from(memoryStore.values())
                    .map(str => JSON.parse(str))
                    .filter(a => a.site === site)
                    .slice(offset, offset + limit);
            } catch (error) {
                console.error('Error getting articles by site:', error);
                return [];
            }
        },

        async getByDateRange(
            startDate: Date,
            endDate: Date,
            limit = 50
        ): Promise<Article[]> {
            const articleIds = await kv.zrangebyscore(
                KEY_PREFIXES.ARTICLES_BY_DATE,
                startDate.getTime(),
                endDate.getTime(),
                {
                    limit: { offset: 0, count: limit }
                }
            );
            
            const articles = await Promise.all(
                articleIds.map(id => this.get(id))
            );
            
            return articles.filter((a): a is Article => a !== null);
        }
    },

    // Site metadata operations
    sites: {
        async updateMetadata(site: string, metadata: Partial<SiteMetadata>): Promise<void> {
            try {
                if (await isKVAvailable()) {
                    const current = await this.getMetadata(site);
                    await kv.set(
                        `${KEY_PREFIXES.SITE_METADATA}${site}`,
                        JSON.stringify({ ...current, ...metadata })
                    );
                }
                // Silently fail if KV is not available
            } catch (error) {
                console.error('Error updating site metadata:', error);
            }
        },

        async getMetadata(site: string): Promise<SiteMetadata> {
            try {
                if (await isKVAvailable()) {
                    const metadata = await kv.get<string>(`${KEY_PREFIXES.SITE_METADATA}${site}`);
                    return metadata ? JSON.parse(metadata) : this.getDefaultMetadata();
                }
                return this.getDefaultMetadata();
            } catch (error) {
                console.error('Error getting site metadata:', error);
                return this.getDefaultMetadata();
            }
        },

        getDefaultMetadata(): SiteMetadata {
            return {
                lastScraped: '',
                totalArticles: 0,
                categories: [],
                authors: [],
                scrapingStats: {
                    successRate: 0,
                    averageArticlesPerScrape: 0,
                    lastSuccessfulScrape: '',
                    errors: { count: 0 }
                }
            };
        }
    },

    // Scraping status and logs
    scraping: {
        async logError(site: string, error: Error): Promise<void> {
            try {
                if (await isKVAvailable()) {
                    const timestamp = new Date().toISOString();
                    await kv.lpush(
                        `${KEY_PREFIXES.SCRAPE_LOG}${site}`,
                        JSON.stringify({
                            timestamp,
                            error: error.message,
                            stack: error.stack
                        })
                    );
                }
                // Log to console as fallback
                console.error(`Scraping error for ${site}:`, error);
            } catch (e) {
                console.error('Error logging scrape error:', e);
            }
        },

        async getStatus(site: string): Promise<string> {
            try {
                if (await isKVAvailable()) {
                    return await kv.get(`${KEY_PREFIXES.SCRAPE_STATUS}${site}`) || 'idle';
                }
                return 'idle';
            } catch (error) {
                console.error('Error getting scrape status:', error);
                return 'idle';
            }
        },

        async setStatus(site: string, status: string): Promise<void> {
            try {
                if (await isKVAvailable()) {
                    await kv.set(`${KEY_PREFIXES.SCRAPE_STATUS}${site}`, status);
                }
                // Silently continue if KV is not available
            } catch (error) {
                console.error('Error setting scrape status:', error);
            }
        }
    }
}; 