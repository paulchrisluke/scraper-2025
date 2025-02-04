import { Article } from '@/types/article';
import { getSlugFromUrl } from '../utils';
import * as cheerio from 'cheerio';

export async function scrapeClioBlog(): Promise<Article[]> {
  const articles: Article[] = [];

  try {
    const response = await fetch('https://www.clio.com/blog/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegalTechScraper/1.0)'
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    const articleLinks = $('a[href*="/blog/"]')
      .map((_, el) => {
        const href = $(el).attr('href');
        if (!href) return null;
        if (href.startsWith('http')) return href;
        if (href.startsWith('/')) return `https://www.clio.com${href}`;
        return `https://www.clio.com/${href}`;
      })
      .get()
      .filter((href): href is string => 
        href !== null &&
        href.includes('/blog/') &&
        !href.endsWith('/blog/') &&
        !href.includes('/category/') &&
        !href.includes('/tag/') &&
        !href.includes('?') // Skip URLs with query parameters
      )
      .slice(0, 5);

    for (const url of articleLinks) {
      try {
        const articleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LegalTechScraper/1.0)'
          }
        });
        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);

        const title = $article('h1').first().text().trim();
        const content = $article('article p')
          .map((_, el) => $article(el).text().trim())
          .get()
          .filter(text => text && text.length > 10)
          .join('\n\n');

        const publishedAt = $article('meta[property="article:published_time"]').attr('content') ||
                          new Date().toISOString();

        if (title && content) {
          articles.push({
            id: getSlugFromUrl(url),
            title,
            content,
            url,
            publishedAt,
            source: 'Clio'
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to process article at ${url}:`, error);
      }
    }

    return articles;
  } catch (error) {
    console.error('Error scraping Clio blog:', error);
    return [];
  }
} 