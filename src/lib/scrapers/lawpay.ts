import { Article } from '@/types/article';
import { getSlugFromUrl } from '../utils';
import * as cheerio from 'cheerio';

export async function scrapeLawPayBlog(): Promise<Article[]> {
  const articles: Article[] = [];

  try {
    const response = await fetch('https://www.lawpay.com/about/blog/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch LawPay blog: ${response.status}`);
    }

    const html = await response.text();
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
        href.split('/').length > 4
      )
      .filter((value, index, self) => self.indexOf(value) === index)
      .slice(0, 5);

    console.log(`Found ${articleLinks.length} LawPay article links`);

    for (const url of articleLinks) {
      try {
        const articleResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!articleResponse.ok) {
          console.error(`Failed to fetch article at ${url}: ${articleResponse.status}`);
          continue;
        }

        const articleHtml = await articleResponse.text();
        const $article = cheerio.load(articleHtml);

        const title = $article('h1, .post-title, .article-title').first().text().trim();
        const content = $article('.post-content, .article-content, .entry-content')
          .find('p')
          .map((_, el) => $article(el).text().trim())
          .get()
          .filter(text => text && text.length > 10)
          .join('\n\n');

        const dateEl = $article('meta[property="article:published_time"]');
        let publishedAt = dateEl.attr('content') || '';
        
        if (!publishedAt) {
          const dateText = $article('.post-date, .article-date').first().text().trim();
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

        if (title && content) {
          articles.push({
            id: getSlugFromUrl(url),
            title,
            content,
            url,
            publishedAt,
            source: 'LawPay'
          });
          console.log(`Successfully scraped article: ${title}`);
        } else {
          console.log(`Skipping article at ${url} - missing title or content`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Failed to process article at ${url}:`, error);
      }
    }

    return articles;
  } catch (error) {
    console.error('Failed to scrape LawPay blog:', error);
    return articles;
  }
} 