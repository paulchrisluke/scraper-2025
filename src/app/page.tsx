import { getAllProgress } from '@/lib/scraping/progress';
import { SCRAPING_CONFIG } from '@/lib/scraping/config';
import { kv } from '@vercel/kv';
import ScrapeButton from '@/components/ScrapeButton';
import ArticleCard from '@/components/ArticleCard';

export const revalidate = 60; // Revalidate every minute

interface ArticleData {
    id: string;
    title: string;
    url: string;
    date: string;
    content: string;
    site: string;
}

export default async function Home() {
    let progress = [];
    let recentArticles: { [key: string]: ArticleData[] } = {};
    
    try {
        progress = await getAllProgress();
        const sites = Object.keys(SCRAPING_CONFIG.sites);
        
        // Fetch latest articles for each site
        for (const site of sites) {
            try {
                const articles = await kv.lrange(`articles:${site}`, 0, 9);
                recentArticles[site] = articles ? articles.map(article => 
                    typeof article === 'string' ? JSON.parse(article) : article
                ) : [];
            } catch (error) {
                console.error(`Error fetching articles for ${site}:`, error);
                recentArticles[site] = [];
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }

    const sites = Object.keys(SCRAPING_CONFIG.sites);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">Legal Blog Scraping Dashboard</h1>
            
            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {sites.map((siteId) => {
                    const site = progress.find(p => p.siteId === siteId) || {
                        totalArticles: 0,
                        scrapedArticles: 0,
                        lastScrapedDate: null
                    };
                    
                    return (
                        <div 
                            key={siteId}
                            className="bg-white rounded-lg shadow-md p-6"
                            style={{ borderTop: `4px solid ${SCRAPING_CONFIG.sites[siteId].color}` }}
                        >
                            <h2 className="text-xl font-semibold mb-4 text-gray-800">
                                {SCRAPING_CONFIG.sites[siteId].name}
                            </h2>
                            <div className="space-y-2">
                                <div className="flex justify-between text-gray-700">
                                    <span>Total Articles:</span>
                                    <span className="font-medium">{site.totalArticles || '0'}</span>
                                </div>
                                <div className="flex justify-between text-gray-700">
                                    <span>Scraped:</span>
                                    <span className="font-medium">{site.scrapedArticles || '0'}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                        className="h-2.5 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(site.scrapedArticles / (site.totalArticles || 1)) * 100}%`,
                                            backgroundColor: SCRAPING_CONFIG.sites[siteId].color
                                        }}
                                    ></div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    Last Updated: {site.lastScrapedDate ? 
                                        new Date(site.lastScrapedDate).toLocaleString() : 
                                        'Never'
                                    }
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Recent Articles */}
            <div className="space-y-8">
                {sites.map((siteId) => (
                    <div key={siteId} className="bg-white rounded-lg shadow-md p-6">
                        <h2 
                            className="text-xl font-semibold mb-4 pb-2 border-b"
                            style={{ color: SCRAPING_CONFIG.sites[siteId].color }}
                        >
                            {SCRAPING_CONFIG.sites[siteId].name} - Recent Articles
                        </h2>
                        <div className="space-y-4">
                            {recentArticles[siteId]?.length > 0 ? (
                                recentArticles[siteId].map((article) => (
                                    <ArticleCard key={article.id} article={article} />
                                ))
                            ) : (
                                <div className="text-gray-600 text-center py-4">
                                    No articles scraped yet. Run the scraper to get started.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Manual Scrape Button */}
            <div className="mt-8 text-center">
                <ScrapeButton />
            </div>
        </div>
    );
}
