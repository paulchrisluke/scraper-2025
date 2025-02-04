'use client';

import { useState } from 'react';

export default function ScrapeButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleScrape = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/scrape', {
                headers: { 
                    'x-api-key': '85016f15e46ca0cba87bedc4dab46064dd490b61b44901160eacd973c3e4e384'  // Your SCRAPE_API_KEY from .env
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to start scraping');
            }

            alert('Scraping started successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Scraping error:', error);
            alert('Failed to start scraping. Check console for details.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button 
            onClick={handleScrape}
            disabled={isLoading}
            className={`${
                isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors`}
        >
            {isLoading ? 'Scraping...' : 'Run Scraper Now'}
        </button>
    );
} 