import { kv } from '@vercel/kv';
import { scrapeClioBlog } from './clio';
import { scrapeMyCaseBlog } from './mycase';
import { scrapeLawPayBlog } from './lawpay';

export async function scrapeAndStore() {
  const articles = [
    ...(await scrapeClioBlog()),
    ...(await scrapeMyCaseBlog()),
    ...(await scrapeLawPayBlog())
  ];

  // Store in Vercel KV
  for (const article of articles) {
    await kv.set(`article:${article.id}`, article);
    await kv.zadd('articles_by_date', {
      score: new Date(article.publishedAt).getTime(),
      member: article.id
    });
  }

  return articles;
} 