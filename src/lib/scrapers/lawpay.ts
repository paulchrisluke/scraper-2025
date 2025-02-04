import { Article } from '@/types/article.js';
import { getSlugFromUrl } from '../utils.js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

export async function scrapeLawPayBlog(): Promise<Article[]> {
  const articles: Article[] = [];

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('Navigating to LawPay blog...');
    await page.goto('https://www.lawpay.com/about/blog/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for any content to load
    await page.waitForSelector('a[href*="/blog/"]', { timeout: 10000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    const articleLinks = $('a[href*="/blog/"]')
      .map((_, el) => {
        const href = $(el).attr('href');
        if (!href) return null;
        if (href.startsWith('http')) return href;
        if (href.startsWith('/')) return `https://www.lawpay.com${href}`;
        return `https://www.lawpay.com/${href}`;
      })
      .get()
      .filter((href): href is string => 
        href !== null &&
        href.includes('/blog/') &&
        !href.endsWith('/blog/') &&
        !href.includes('/category/') &&
        !href.includes('/tag/') &&
        !href.includes('?') &&
        !href.includes('#') &&
        !href.includes('page') &&
        href.split('/').length > 4  // Ensure it's a blog post URL
      )
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      .slice(0, 5);

    console.log(`Found ${articleLinks.length} LawPay article links`);

    for (const url of articleLinks) {
      try {
        console.log(`Scraping article: ${url}`);
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for the main content to load
        await page.waitForSelector('.post-content, article, .entry-content', { timeout: 10000 });

        // Extract content using page evaluation for better JavaScript support
        const article = await page.evaluate(() => {
          const title = document.querySelector('h1')?.textContent?.trim() || '';
          
          // Get all paragraphs from the main content area
          const contentElements = Array.from(document.querySelectorAll('.post-content p, article p, .entry-content p'));
          const content = contentElements
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 10)
            .join('\n\n');

          // Try to find the date
          const dateEl = document.querySelector('meta[property="article:published_time"]');
          let publishedAt = dateEl?.getAttribute('content') || '';
          
          if (!publishedAt) {
            const dateText = document.querySelector('.post-date, .article-date')?.textContent?.trim();
            if (dateText) {
              try {
                publishedAt = new Date(dateText).toISOString();
              } catch (e) {
                publishedAt = new Date().toISOString();
              }
            } else {
              publishedAt = new Date().toISOString();
            }
          }

          return { title, content, publishedAt };
        });

        if (article.title && article.content) {
          articles.push({
            id: getSlugFromUrl(url),
            title: article.title,
            content: article.content,
            url,
            publishedAt: article.publishedAt,
            source: 'LawPay'
          });
          console.log(`Successfully scraped article: ${article.title}`);
        } else {
          console.log(`Skipping article at ${url} - missing title or content`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Failed to process article at ${url}:`, error);
      }
    }

    await browser.close();
    return articles;
  } catch (error) {
    console.error('Failed to scrape LawPay blog:', error);
    return articles;
  }
} 