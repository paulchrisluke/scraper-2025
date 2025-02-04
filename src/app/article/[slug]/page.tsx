'use client';

import { useEffect, useState } from 'react';
import { Article } from '@/types/article';
import { fetchArticles } from '@/lib/api';

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadArticle() {
      try {
        setLoading(true);
        const articles = await fetchArticles();
        const found = articles.find(a => a.id === params.slug);
        if (found) {
          setArticle(found);
        } else {
          setError('Article not found');
        }
      } catch (e) {
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Article not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          <div className="flex items-center text-gray-600 mb-4">
            <span className="mr-4">
              {new Date(article.publishedAt).toLocaleDateString()}
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {article.source}
            </span>
          </div>
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View Original Article
          </a>
        </div>
        
        <div className="prose max-w-none">
          {article.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="mb-4">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
} 