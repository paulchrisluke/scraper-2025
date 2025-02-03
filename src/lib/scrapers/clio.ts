import { Article } from '@/types/article';
import { getSlugFromUrl } from '../utils/slug';
import puppeteer from 'puppeteer';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function retry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retry(fn, retries - 1);
    }
    throw error;
  }
}

export async function scrapeClioBlog(): Promise<Article[]> {
  let browser = null;
  let page = null;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox']
    });
    
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    console.log('Starting Clio blog scrape...');
    const posts: Article[] = [];
    
    // Start with the blog index page
    await retry(async () => {
      await page.goto('https://www.clio.com/blog/', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    });
    
    console.log('Blog index page loaded, gathering article links...');
    
    const articleLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/blog/"]'))
        .map(a => a.href)
        .filter(href => 
          href.includes('/blog/') &&
          !href.endsWith('/blog/') &&
          !href.includes('/category/') &&
          !href.includes('/tag/') &&
          !href.includes('/author/')
        )
        .slice(0, 5); // Get latest 5 articles
    });
    
    console.log(`Found ${articleLinks.length} article links`);
    
    for (const url of articleLinks) {
      try {
        console.log(`Processing article at ${url}`);
        
        await retry(async () => {
          await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });
        });
        
        // Extract Schema.org data first
        const schemaData = await page.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent || '{}');
              if (data['@type'] === 'Article' || data['@type'] === 'BlogPosting') {
                return { type: data['@type'], data };
              }
            } catch (e) {
              console.error('Error parsing Schema.org data:', e);
            }
          }
          return null;
        });
        
        const data = await page.evaluate(() => {
          const title = document.querySelector('h1')?.textContent?.trim();
          const content = Array.from(document.querySelectorAll('article p, article li'))
            .map(el => el.textContent?.trim())
            .filter(text => text && 
              !text.includes('©') &&
              !text.includes('All rights reserved') &&
              text.length > 10
            )
            .join('\n\n');
            
          const dateStr = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
                         document.querySelector('time[datetime]')?.getAttribute('datetime');
                         
          const author = document.querySelector('meta[name="author"]')?.getAttribute('content') ||
                        document.querySelector('[itemprop="author"]')?.textContent?.trim();
                        
          const categories = Array.from(document.querySelectorAll('.post-categories a, .blog-categories a'))
            .map(el => el.textContent?.trim())
            .filter(Boolean);
            
          const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                                document.querySelector('meta[property="og:description"]')?.getAttribute('content');
                                
          const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                          document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
          
          return {
            title,
            content,
            dateStr,
            author,
            categories,
            metaDescription,
            imageUrl
          };
        });
        
        if (data.title && data.content) {
          const id = getSlugFromUrl(url);
          const now = new Date();
          const publishedAt = data.dateStr ? new Date(data.dateStr) : now;
          
          posts.push({
            id,
            title: data.title,
            content: data.content,
            summary: data.metaDescription || '',
            url,
            imageUrl: data.imageUrl || '',
            publishedAt,
            source: 'clio',
            author: data.author,
            categories: data.categories,
            schema: schemaData,
            createdAt: now,
            updatedAt: now
          });
          
          console.log(`Successfully processed: ${data.title}`);
        }
        
        // Add a small delay between requests
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.error(`Failed to process article at ${url}:`, error);
      }
    }
    
    console.log(`Successfully scraped ${posts.length} posts from Clio`);
    return posts;
    
  } catch (error) {
    console.error('Error scraping Clio blog:', error);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

// Testing function
export async function testClioScraper() {
  try {
    const posts = await scrapeClioBlog();
    console.log(`Found ${posts.length} posts`);
    if (posts.length > 0) {
      console.log('Sample post:', JSON.stringify(posts[0], null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
} 