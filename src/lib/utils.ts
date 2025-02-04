import { createHash } from 'crypto';

export function generateId(url: string): string {
    return createHash('md5').update(url).digest('hex');
}

export function calculateReadingTime(wordCount: number): number {
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
}

export function getSlugFromUrl(url: string): string {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const slug = path.split('/').filter(Boolean).pop() || '';
    return slug;
}

export function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .trim();
}

export function extractTextContent(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
} 