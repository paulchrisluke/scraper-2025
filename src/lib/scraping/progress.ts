import { kv } from '@vercel/kv';

export interface ScrapingProgress {
    siteId: string;
    totalArticles: number;
    scrapedArticles: number;
    lastScrapedUrl: string;
    lastScrapedDate: string;
    nextPageUrl: string | null;
    isComplete: boolean;
    errors: string[];
    lastUpdated?: string;
}

export async function updateProgress(progress: Partial<ScrapingProgress> & { siteId: string }) {
    const key = `progress:${progress.siteId}`;
    const currentProgress = await getProgress(progress.siteId);
    
    const updatedProgress = {
        ...currentProgress,
        ...progress,
        lastUpdated: new Date().toISOString()
    };
    
    await kv.set(key, updatedProgress);
    return updatedProgress;
}

export async function getProgress(siteId: string): Promise<ScrapingProgress> {
    const key = `progress:${siteId}`;
    const progress = await kv.get<ScrapingProgress>(key);
    
    if (!progress) {
        return {
            siteId,
            totalArticles: 0,
            scrapedArticles: 0,
            lastScrapedUrl: '',
            lastScrapedDate: '',
            nextPageUrl: null,
            isComplete: false,
            errors: []
        };
    }
    
    return progress;
}

export async function getAllProgress(): Promise<ScrapingProgress[]> {
    try {
        const sites = ['clio', 'mycase', 'lawpay'];
        const progress = await Promise.all(sites.map(site => getProgress(site)));
        return progress;
    } catch (error) {
        console.error('Error getting progress:', error);
        return [];
    }
}

export async function logError(siteId: string, error: string) {
    const progress = await getProgress(siteId);
    progress.errors.push(`${new Date().toISOString()}: ${error}`);
    
    // Keep only last 100 errors
    if (progress.errors.length > 100) {
        progress.errors = progress.errors.slice(-100);
    }
    
    await updateProgress(progress);
} 