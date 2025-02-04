import { Article } from '@/types/article';
import { getSlugFromUrl } from '../utils';
import * as cheerio from 'cheerio';

export async function scrapeMyCaseBlog(): Promise<Article[]> {
  try {
    console.log('Fetching MyCase blog homepage...');
    const response = await fetch('https://www.mycase.com/blog/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalTechScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch MyCase blog: ${response.status} ${response.statusText}`);
      return [];
    }

    const html = await response.text();
    console.log('Parsing MyCase blog HTML...');
    const $ = cheerio.load(html);
    
    // Get all article links
    console.log('Looking for article links...');
    const articleLinks = $('article a[href*="/blog/"], .blog__list a[href*="/blog/"], .blog-list a[href*="/blog/"]')
      .map((_, element) => {
        const href = $(element).attr('href');
        console.log('Found link:', href);
        if (href && !href.endsWith('/blog/') && href.includes('/blog/')) {
          return href.startsWith('http') ? href : `https://www.mycase.com${href}`;
        }
      })
      .get()
      .filter((href, index, self) => href && self.indexOf(href) === index) // Remove duplicates
      .filter(href => !href.includes('/category/') && !href.includes('/tag/'))
      .slice(0, 5); // Only process first 5 articles

    console.log(`Found ${articleLinks.length} article links:`, articleLinks);
    const articles: Article[] = [];

    // Process each article
    for (const url of articleLinks) {
      try {
        console.log(`Processing article: ${url}`);
        const articleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LegalTechScraper/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache'
          }
        });

        if (!articleResponse.ok) {
          console.error(`Failed to fetch article ${url}: ${articleResponse.status} ${articleResponse.statusText}`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);

        // Try multiple possible selectors for each field
        const title = $article('h1, .single__blog-title, .blog-title').first().text().trim();
        const content = $article('.entry-content, .single__blog-content, article').text().trim();
        const dateText = $article('.date_inner, .single__blog-date, time').first().text().trim();
        const publishedAt = dateText ? new Date(dateText).toISOString() : new Date().toISOString();

        console.log('Article data:', { title, contentLength: content.length, publishedAt });

        if (title && content) {
          articles.push({
            id: getSlugFromUrl(url),
            title,
            content,
            url,
            publishedAt,
            source: 'MyCase'
          });
          console.log('Successfully added article:', title);
        } else {
          console.log('Skipping article due to missing title or content');
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error processing article ${url}:`, error);
      }
    }

    return articles;
  } catch (error) {
    console.error('Error scraping MyCase blog:', error);
    return [];
  }
} 