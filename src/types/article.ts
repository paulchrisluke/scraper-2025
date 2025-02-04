export type ArticleSource = 'clio' | 'mycase' | 'lawpay';

export type Article = {
  id: string;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: 'Clio' | 'MyCase' | 'LawPay' | 'AI Generated';
};

export interface GeneratedArticle extends Article {
  originalArticleId: string;
  aiGeneratedContent: string;
  aiGeneratedTitle: string;
  aiGeneratedSummary: string;
  aiGeneratedImage: string;
  status: 'pending' | 'approved' | 'rejected';
  generatedAt: string | Date;
} 