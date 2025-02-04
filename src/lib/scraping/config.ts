import { ScrapeConfig } from '@/types';

export const SCRAPING_CONFIG: ScrapeConfig = {
    batchSize: 5, // Articles per day per site
    sites: {
        clio: {
            baseUrl: 'https://www.clio.com/blog/',
            name: 'Clio Blog',
            color: '#4A90E2',
            paginationSelector: '.pagination__next',
            articleSelector: 'a[href*="/blog/"]',
            titleSelector: 'h1',
            dateSelector: 'meta[property="article:published_time"]',
            contentSelector: 'article p'
        },
        myCase: {
            baseUrl: 'https://www.mycase.com/blog/',
            name: 'MyCase Blog',
            color: '#50B83C',
            paginationSelector: '.next.page-numbers',
            articleSelector: 'article.post',
            titleSelector: 'h2.entry-title a',
            dateSelector: 'time.entry-date',
            contentSelector: '.entry-content'
        },
        lawPay: {
            baseUrl: 'https://www.lawpay.com/about/blog/',
            name: 'LawPay Blog',
            color: '#F5A623',
            paginationSelector: '.nav-links .next',
            articleSelector: 'article.blog-post',
            titleSelector: '.blog-post__title',
            dateSelector: '.blog-post__date',
            contentSelector: '.blog-post__content'
        }
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalTechScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
    },
    delays: {
        betweenPages: 1000, // 1 second between page requests
        betweenSites: 2000  // 2 seconds between different sites
    }
} 