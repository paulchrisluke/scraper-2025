import { Article } from '@/lib/db/schema';
import { generateId, calculateReadingTime, sanitizeHtml, extractTextContent, delay } from '../utils';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { db } from '../db/schema';

export async function scrapeClioBlog(page = 1, maxPages = 5): Promise<Article[]> {
    const articles: Article[] = [];
    const baseUrl = 'https://www.clio.com/blog';
    let currentPage = page;
    let hasNextPage = true;
    
    try {
        while (hasNextPage && currentPage <= maxPages) {
            const pageUrl = currentPage === 1 ? baseUrl : `${baseUrl}/page/${currentPage}/`;
            console.log(`Scraping page ${currentPage}: ${pageUrl}`);
            
            const response = await fetch(pageUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                }
            });

            if (response.status === 404) {
                console.log('No more pages to scrape');
                break;
            }

            const html = await response.text();
            const $ = cheerio.load(html);

            // Check if next page exists
            hasNextPage = !!$('.o-pagination a[href*="/page/"]').length;

            // Get all article elements
            const articleElements = $('.o-resource.l-resource');
            console.log(`Found ${articleElements.length} article elements on page ${currentPage}`);

            for (const element of articleElements) {
                try {
                    const $article = $(element);
                    
                    // Skip if not an article type
                    if (!$article.find('.o-resource__type--article').length) continue;
                    
                    // Get article URL and check if already exists
                    const url = $article.find('a').first().attr('href');
                    if (!url) {
                        console.log('No URL found for article');
                        continue;
                    }

                    // Generate ID and check for duplicates
                    const articleId = generateId(url);
                    const existingArticle = await db.articles.get(articleId);
                    
                    if (existingArticle) {
                        console.log(`Article already exists: ${url}`);
                        continue;
                    }

                    console.log(`Processing new article: ${url}`);

                    const articleResponse = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                        }
                    });
                    const articleHtml = await articleResponse.text();
                    const $fullArticle = cheerio.load(articleHtml);

                    // Extract article data
                    const title = $article.find('.o-resource__title').text().trim() || 
                                $fullArticle('h1').first().text().trim();
                    const rawContent = $fullArticle('article.post, .post-content').html() || '';
                    const content = sanitizeHtml(rawContent);
                    const excerpt = $article.find('.o-resource__excerpt').text().trim() ||
                                   $fullArticle('meta[name="description"]').attr('content') ||
                                   extractTextContent(content).slice(0, 200) + '...';
                    
                    const readingTimeText = $article.find('.l-resource__reading-time').text().trim();
                    const readingTimeMatch = readingTimeText.match(/(\d+)/);
                    const readingTime = readingTimeMatch ? parseInt(readingTimeMatch[1]) : calculateReadingTime(extractTextContent(content).split(/\s+/).length);

                    const author = $fullArticle('.author-meta__name, .author-name').text().trim() || 'Clio Team';
                    const date = $fullArticle('meta[property="article:published_time"]').attr('content') || 
                                new Date().toISOString();
                    
                    const categories = $fullArticle('.post-meta__categories a, .category-links a')
                        .map((_, el) => $(el).text().trim())
                        .get();
                    
                    const tags = $fullArticle('.post-meta__tags a, .tag-links a')
                        .map((_, el) => $(el).text().trim())
                        .get();

                    // Calculate metadata
                    const wordCount = extractTextContent(content).split(/\s+/).length;
                    const hasImages = $fullArticle('article.post img, .post-content img').length > 0;
                    const imageCount = $fullArticle('article.post img, .post-content img').length;

                    // Extract SEO metadata
                    const seo = {
                        metaTitle: $fullArticle('meta[property="og:title"]').attr('content') || title,
                        metaDescription: $fullArticle('meta[property="og:description"]').attr('content') || excerpt,
                        canonicalUrl: $fullArticle('link[rel="canonical"]').attr('href') || url,
                        ogImage: $fullArticle('meta[property="og:image"]').attr('content') || ''
                    };

                    // Create article object
                    const article: Article = {
                        id: articleId,
                        url,
                        title,
                        content,
                        excerpt,
                        author,
                        date,
                        site: 'clio',
                        categories,
                        tags,
                        metadata: {
                            wordCount,
                            readingTime,
                            hasImages,
                            imageCount
                        },
                        seo,
                        schema: {
                            articleType: 'BlogPosting',
                            articleBody: extractTextContent(content),
                            datePublished: date,
                            dateModified: $fullArticle('meta[property="article:modified_time"]').attr('content') || date,
                            publisher: 'Clio'
                        }
                    };

                    articles.push(article);
                    console.log(`Scraped article: ${title}`);

                    // Update site metadata
                    await db.sites.updateMetadata('clio', {
                        lastScraped: new Date().toISOString(),
                        totalArticles: (await db.sites.getMetadata('clio')).totalArticles + 1
                    });

                    // Be nice to the server
                    await delay(1000);
                } catch (error) {
                    console.error('Error processing article:', error);
                    await db.scraping.logError('clio', error instanceof Error ? error : new Error(String(error)));
                }
            }

            currentPage++;
            if (articles.length === 0 && currentPage > 2) {
                console.log('No new articles found in the last 2 pages, stopping');
                break;
            }
        }

        return articles;
    } catch (error) {
        console.error('Error scraping Clio blog:', error);
        await db.scraping.logError('clio', error instanceof Error ? error : new Error(String(error)));
        return [];
    }
} 