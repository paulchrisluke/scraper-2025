'use client';

import { useState } from 'react';
import { SCRAPING_CONFIG } from '@/lib/scraping/config';

interface ScrapingState {
    [key: string]: {
        isLoading: boolean;
        error: string | null;
    };
}

export default function ScrapingButtons() {
    const [scrapingState, setScrapingState] = useState<ScrapingState>(
        Object.keys(SCRAPING_CONFIG.sites).reduce((acc, site) => ({
            ...acc,
            [site]: { isLoading: false, error: null }
        }), {})
    );

    const handleScrape = async (site: string) => {
        try {
            // Update state for this specific site
            setScrapingState(prev => ({
                ...prev,
                [site]: { isLoading: true, error: null }
            }));

            // Get API key from environment
            const apiKey = process.env.NEXT_PUBLIC_SCRAPE_API_KEY;
            if (!apiKey) {
                throw new Error('API key not found. Please check your environment variables.');
            }

            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ site })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `Failed to scrape ${site}`);
            }

            // Only reload if scraping was successful
            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.error || `Scraping ${site} completed with errors`);
            }
        } catch (error) {
            console.error(`Scraping error for ${site}:`, error);
            setScrapingState(prev => ({
                ...prev,
                [site]: {
                    isLoading: false,
                    error: error instanceof Error ? error.message : 'An unknown error occurred'
                }
            }));
        } finally {
            setScrapingState(prev => ({
                ...prev,
                [site]: { ...prev[site], isLoading: false }
            }));
        }
    };

    return (
        <div className="space-y-6">
            {Object.entries(SCRAPING_CONFIG.sites).map(([siteId, site]) => (
                <div key={siteId} className="space-y-2">
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => handleScrape(siteId)}
                            disabled={scrapingState[siteId].isLoading}
                            className={`
                                inline-flex items-center px-4 py-2 rounded-lg shadow-sm text-sm font-medium
                                ${scrapingState[siteId].isLoading 
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                    : `bg-[${site.color}] text-white hover:opacity-90`
                                }
                                transition-colors duration-200
                            `}
                            style={{ backgroundColor: scrapingState[siteId].isLoading ? undefined : site.color }}
                        >
                            {scrapingState[siteId].isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Scraping {site.name}...
                                </>
                            ) : (
                                `Scrape ${site.name}`
                            )}
                        </button>
                    </div>

                    {scrapingState[siteId].error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {scrapingState[siteId].error}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
} 