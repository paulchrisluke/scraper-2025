import { z } from 'zod';

export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  summary: z.string(),
  url: z.string().url(),
  imageUrl: z.string().url().optional(),
  publishedAt: z.union([z.string(), z.date()]),
  source: z.enum(['clio', 'mycase', 'lawpay']),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  categories: z.array(z.string()).optional(),
  author: z.string().optional(),
  metaDescription: z.string().optional(),
  schema: z.object({
    type: z.string(),
    data: z.record(z.any())
  }).optional()
});

export const generatedArticleSchema = articleSchema.extend({
  originalArticleId: z.string(),
  aiGeneratedContent: z.string(),
  aiGeneratedTitle: z.string(),
  aiGeneratedSummary: z.string(),
  aiGeneratedImage: z.string().url(),
  status: z.enum(['pending', 'approved', 'rejected']),
  generatedAt: z.union([z.string(), z.date()])
});

export const apiKeySchema = z.object({
  key: z.string().min(32)
});

export const cronSecretSchema = z.object({
  secret: z.string().min(32)
});

export type Article = z.infer<typeof articleSchema>;
export type GeneratedArticle = z.infer<typeof generatedArticleSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type CronSecret = z.infer<typeof cronSecretSchema>; 