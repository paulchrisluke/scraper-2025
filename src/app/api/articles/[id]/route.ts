import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const headersList = headers();
    const apiKey = headersList.get('x-api-key');

    // Allow viewing in browser with no API key, but require key for programmatic access
    const isBrowser = headersList.get('sec-fetch-dest') === 'document';
    if (!isServer && !apiKey && !isServer) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Search for the article in all site collections
        const sites = ['clio', 'mycase', 'lawpay'];
        let article = null;

        for (const site of sites) {
            const articles = await kv.lrange(`articles:${site}`, 0, -1);
            article = articles
                .map(a => JSON.parse(a))
                .find(a => a.id === params.id);
            
            if (article) break;
        }

        if (!article) {
            return new NextResponse('Article not found', { status: 404 });
        }

        // If viewing in browser, return a formatted HTML view
        if (isServer) {
            return new NextResponse(
                `<!DOCTYPE html>
                <html>
                    <head>
                        <title>${article.title}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                    </head>
                    <body class="bg-gray-100 p-8">
                        <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
                            <h1 class="text-2xl font-bold mb-4">${article.title}</h1>
                            <div class="mb-4 text-gray-600">
                                Published: ${new Date(article.date).toLocaleString()}
                            </div>
                            <pre class="bg-gray-50 p-4 rounded-lg overflow-auto">
                                ${JSON.stringify(article, null, 2)}
                            </pre>
                        </div>
                    </body>
                </html>`,
                {
                    headers: {
                        'Content-Type': 'text/html',
                    },
                }
            );
        }

        return NextResponse.json(article);
    } catch (error) {
        console.error('Article Fetch Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 