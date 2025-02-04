'use client';

interface ArticleCardProps {
    article: {
        id: string;
        title: string;
        date: string;
    };
}

export default function ArticleCard({ article }: ArticleCardProps) {
    return (
        <div 
            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => window.open(`/api/articles/${article.id}`, '_blank')}
        >
            <h3 className="font-medium mb-2 text-gray-800">{article.title}</h3>
            <div className="flex justify-between text-sm text-gray-600">
                <span>{new Date(article.date).toLocaleDateString()}</span>
                <span>→ View JSON</span>
            </div>
        </div>
    );
} 