export interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
  source: 'clio' | 'mycase' | 'lawpay';
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  imageUrl: string;
  sourceReferences: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 