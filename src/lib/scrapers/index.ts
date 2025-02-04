import { kv } from '@vercel/kv';
import { scrapeClioBlog } from './clio.js';
import { scrapeMyCaseBlog } from './mycase.js';
import { scrapeLawPayBlog } from './lawpay.js';

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