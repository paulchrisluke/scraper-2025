import { BlogPost } from '@/types/index.js';
import { getSlugFromUrl } from '../utils/slug.js';
import { chromium } from 'playwright';

export async function scrapeLawPayBlog(): Promise<BlogPost[]> {
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    browser = await chromium.launch({
      headless: false // Try with visible browser for debugging
    });
    
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2
    });
    
    page = await context.newPage();
    
    console.log('Starting LawPay blog scrape...');
    const posts: BlogPost[] = [];
    
    // Start with the blog index page
    await page.goto('https://www.lawpay.com/about/blog/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('Blog index page loaded, gathering article links...');
    
    // Get all article links from the blog index
    const articleLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/blog/"]'))
        .map(link => {
          const href = link.getAttribute('href');
          if (!href) return null;
          return href.startsWith('http') ? href : `https://www.lawpay.com${href}`;
        })
        .filter((href): href is string => 
          href && 
          href.includes('/blog/') &&
          !href.endsWith('/blog/') &&
          !href.includes('/category/') &&
          !href.includes('/tag/') &&
          !href.includes('/author/')
        );
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
          // Try to find the title with exact Tailwind selectors
          const titleSelectors = [
            'div.px-4 h1',
            'h1',
            '.entry-title',
            '.post-title',
            '.blog-title'
          ];
          let title = null;
          for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              title = element.textContent?.trim();
              if (title) break;
            }
          }
          
          // Try to find the date with exact Tailwind selectors
          const dateSelectors = [
            'div.ml-4 > div.font-bold.text-xs',
            'div.ml-4 > div.text-xs.font-bold',
            // Fallback to standard selectors
            'meta[property="article:published_time"]',
            'meta[property="og:article:published_time"]',
            '.post-meta time',
            '.meta-date'
          ];
          
          let dateStr = null;
          for (const selector of dateSelectors) {
            let element = document.querySelector(selector);
            if (element) {
              if (element.tagName.toLowerCase() === 'meta') {
                dateStr = element.getAttribute('content');
              } else {
                dateStr = element.textContent?.trim() || element.getAttribute('datetime');
              }
              if (dateStr) break;
            }
          }
          
          // Try to find the author with exact Tailwind selectors
          const authorSelectors = [
            'div.ml-4 > div.font-light.text-sm',
            'div.ml-4 > div.text-sm.font-light',
            // Fallback to standard selectors
            'meta[name="author"]',
            '[itemprop="author"]',
            '.author-name'
          ];
          
          let author = null;
          for (const selector of authorSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              if (element.tagName.toLowerCase() === 'meta') {
                author = element.getAttribute('content');
              } else {
                author = element.textContent?.trim();
              }
              if (author) break;
            }
          }
          
          // Try to find the category with exact Tailwind selectors
          const categorySelectors = [
            'p.uppercase.tracking-wider.font-normal.text-xs',
            'p.text-xs.uppercase.tracking-wider',
            // Fallback to standard selectors
            '.post-categories',
            '.blog-categories',
            '.entry-categories'
          ];
          
          let categories = [];
          for (const selector of categorySelectors) {
            const element = document.querySelector(selector);
            if (element) {
              const category = element.textContent?.trim();
              if (category) {
                categories.push(category);
                break;
              }
            }
          }
          
          // Try to find the content with exact Tailwind selectors
          const contentSelectors = [
            'div.markdown p',
            'article.flex.mx-auto p',
            'div.px-4 p',
            // Fallback to standard selectors
            '.entry-content p',
            'article .post-content p',
            '.blog-content p'
          ];
          
          let content = '';
          let paragraphs = [];
          for (const selector of contentSelectors) {
            paragraphs = Array.from(document.querySelectorAll(selector))
              .map(p => p.textContent?.trim())
              .filter(text => text && 
                !text.includes('©') && // Filter out copyright notices
                !text.includes('All rights reserved') &&
                text.length > 10 // Filter out very short paragraphs that might be metadata
              );
            
            if (paragraphs.length > 0) {
              content = paragraphs.join('\n\n');
              break;
            }
          }
          
          // Try to find meta description
          const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                          document.querySelector('meta[property="og:description"]')?.getAttribute('content');
          
          // Try to find featured image
          const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                          document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
          
          return {
            title,
            author,
            dateStr,
            content,
            categories,
            metaDescription: metaDesc,
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
            source: 'lawpay' as const,
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
    
    console.log(`Successfully scraped ${posts.length} posts from LawPay`);
    return posts;
  } catch (error) {
    console.error('Error scraping LawPay blog:', error);
    throw error;
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Testing the scraper directly
async function test() {
  try {
    const posts = await scrapeLawPayBlog();
    console.log(`Found ${posts.length} posts`);
    if (posts.length > 0) {
      console.log('Sample post:', JSON.stringify(posts[0], null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test if file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  test();
} 