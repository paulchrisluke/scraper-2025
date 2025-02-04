import { useState, useEffect } from 'react';
import { Article } from '@/types/article';
import { fetchArticles, triggerScrape } from '@/lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    try {
      setLoading(true);
      const data = await fetchArticles();
      setArticles(data);
      setError(null);
    } catch (e) {
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  }

  async function handleScrape() {
    try {
      setScraping(true);
      const data = await triggerScrape();
      setArticles(data);
      setError(null);
    } catch (e) {
      setError('Failed to trigger scrape');
    } finally {
      setScraping(false);
    }
  }

  const articlesBySource = articles.reduce((acc, article) => {
    const source = article.source;
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Legal Blog Dashboard</h1>
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {scraping ? 'Scraping...' : 'Trigger Scrape'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(articlesBySource).map(([source, sourceArticles]) => (
          <div key={source} className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{source}</h2>
            <div className="space-y-4">
              {sourceArticles.map((article) => (
                <div key={article.id} className="border-b pb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    <Link 
                      href={`/article/${article.id}`}
                      className="hover:text-blue-500"
                    >
                      {article.title}
                    </Link>
                  </h3>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-600 text-sm">
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </p>
                    <a 
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 text-sm hover:underline"
                    >
                      Original →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 