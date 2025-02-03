export type ArticleSource = 'clio' | 'mycase' | 'lawpay';

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  imageUrl: string;
  publishedAt: string | Date;
  source: ArticleSource;
  createdAt: string | Date;
  updatedAt: string | Date;
  categories?: string[];
  author?: string;
  metaDescription?: string;
  schema?: {
    type: string;
    data: Record<string, any>;
  };
}

export interface GeneratedArticle extends Article {
  originalArticleId: string;
  aiGeneratedContent: string;
  aiGeneratedTitle: string;
  aiGeneratedSummary: string;
  aiGeneratedImage: string;
  status: 'pending' | 'approved' | 'rejected';
  generatedAt: string | Date;
} 