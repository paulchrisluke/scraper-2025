import { kv } from '@vercel/kv';
import { Article, GeneratedArticle } from './schemas';

export async function storeArticle(article: Article) {
  await kv.zadd('articles', {
    score: new Date(article.publishedAt).getTime(),
    member: article
  });
}

export async function storeGeneratedArticle(article: GeneratedArticle) {
  await kv.zadd('generated_articles', {
    score: new Date(article.generatedAt).getTime(),
    member: article
  });
}

export async function getLatestArticles(limit = 20): Promise<Article[]> {
  return kv.zrange('articles', 0, limit - 1, { rev: true }) as Promise<Article[]>;
}

export async function getLatestGeneratedArticles(limit = 20): Promise<GeneratedArticle[]> {
  return kv.zrange('generated_articles', 0, limit - 1, { rev: true }) as Promise<GeneratedArticle[]>;
}

export async function getPendingGeneratedArticles(): Promise<GeneratedArticle[]> {
  const articles = await getLatestGeneratedArticles(100);
  return articles.filter(article => article.status === 'pending');
}

export async function updateGeneratedArticleStatus(id: string, status: 'approved' | 'rejected') {
  const articles = await getLatestGeneratedArticles(100);
  const article = articles.find(a => a.id === id);
  
  if (article) {
    article.status = status;
    article.updatedAt = new Date().toISOString();
    
    await kv.zadd('generated_articles', {
      score: new Date(article.generatedAt).getTime(),
      member: article
    });
    
    return article;
  }
  
  return null;
}

export async function getArticleById(id: string): Promise<Article | null> {
  const articles = await getLatestArticles(100);
  return articles.find(a => a.id === id) || null;
}

export async function getGeneratedArticleById(id: string): Promise<GeneratedArticle | null> {
  const articles = await getLatestGeneratedArticles(100);
  return articles.find(a => a.id === id) || null;
} 