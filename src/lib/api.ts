import { Article } from '@/types/article';

const API_KEY = process.env.NEXT_PUBLIC_SCRAPE_API_KEY;

export async function fetchArticles(): Promise<Article[]> {
  const response = await fetch('/api/articles', {
    headers: {
      'x-api-key': API_KEY || ''
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch articles');
  }

  const data = await response.json();
  return data.data;
}

export async function triggerScrape(): Promise<Article[]> {
  const response = await fetch('/api/scrape', {
    headers: {
      'x-api-key': API_KEY || ''
    }
  });

  if (!response.ok) {
    throw new Error('Failed to trigger scrape');
  }

  const data = await response.json();
  return data.data;
} 