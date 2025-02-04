import puppeteer from 'puppeteer';
import { Article } from '../../types/article';
import { getSlugFromUrl } from '../utils';

export async function scrapeLawPayBlog(): Promise<Article[]> {
  const articles: Article[] = [];
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  try {
    console.log('Launching browser...');
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1200, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Fetching LawPay blog homepage...');
    await page.goto('https://www.lawpay.com/about/blog/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for the blog content to load
    await page.waitForSelector('#blog-filter', { timeout: 20000 });

    // Get all blog article links
    const articleLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/about/blog/"]:not([href*="/category/"])'));
      return links
        .map(link => link.getAttribute('href'))
        .filter(href => href && !href.includes('/about/blog/category/'))
        .slice(0, 5); // Limit to first 5 articles
    });

    console.log(`Found ${articleLinks.length} article links`);

    // Process each article
    for (const link of articleLinks) {
      if (!link) continue;
      
      const fullUrl = new URL(link, 'https://www.lawpay.com').href;
      console.log(`Processing article: ${fullUrl}`);

      await page.goto(fullUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for the article content to be rendered
      try {
        await page.waitForSelector('h1, article', { timeout: 10000 });
      } catch (error) {
        console.log('Timeout waiting for article content');
        continue;
      }

      const articleData = await page.evaluate(() => {
        const title = document.querySelector('h1')?.textContent?.trim();
        const content = document.querySelector('article')?.textContent?.trim();
        
        // Try to find the publication date in various places
        let publishedAt = null;

        // First try meta tags
        const metaDate = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
        if (metaDate) {
          publishedAt = metaDate;
        }

        // Then try time elements
        if (!publishedAt) {
          const timeElement = document.querySelector('time');
          publishedAt = timeElement?.getAttribute('datetime') || timeElement?.textContent?.trim();
        }

        // Finally try date elements with specific class names
        if (!publishedAt) {
          const dateElement = document.querySelector('.blog-article-date, .post-date');
          publishedAt = dateElement?.textContent?.trim();
        }

        // If still no date found, try parsing from URL or other sources
        if (!publishedAt) {
          const urlMatch = window.location.pathname.match(/\/(\d{4})\/(\d{2})\//);
          if (urlMatch) {
            const [_, year, month] = urlMatch;
            publishedAt = `${year}-${month}-01`;
          }
        }

        return {
          title,
          content,
          publishedAt
        };
      });

      if (articleData.title && articleData.content) {
        console.log('Article data:', {
          title: articleData.title,
          contentLength: articleData.content.length,
          publishedAt: articleData.publishedAt
        });

        articles.push({
          id: getSlugFromUrl(fullUrl),
          title: articleData.title,
          content: articleData.content,
          url: fullUrl,
          publishedAt: articleData.publishedAt ? new Date(articleData.publishedAt) : new Date(),
          source: 'LawPay'
        });

        console.log(`Successfully added article: ${articleData.title}`);
      } else {
        console.log('Skipping article due to missing title or content');
      }
    }
  } catch (error) {
    console.error('Error scraping LawPay blog:', error);
  } finally {
    await browser.close();
  }

  return articles;
} 