import { z } from 'zod';

const schemaArticleSchema = z.object({
  '@type': z.enum(['Article', 'BlogPosting', 'NewsArticle']),
  headline: z.string().optional(),
  description: z.string().optional(),
  datePublished: z.string().optional(),
  dateModified: z.string().optional(),
  author: z.union([
    z.string(),
    z.object({
      '@type': z.string(),
      name: z.string()
    })
  ]).optional(),
  publisher: z.union([
    z.string(),
    z.object({
      '@type': z.string(),
      name: z.string()
    })
  ]).optional(),
  image: z.union([
    z.string(),
    z.object({
      '@type': z.string(),
      url: z.string()
    })
  ]).optional(),
  mainEntityOfPage: z.union([
    z.string(),
    z.object({
      '@type': z.string(),
      '@id': z.string()
    })
  ]).optional()
});

export type SchemaArticle = z.infer<typeof schemaArticleSchema>;

export function extractSchemaOrgData(html: string): SchemaArticle | null {
  try {
    const schemaScripts = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/gs);
    
    if (!schemaScripts) return null;
    
    for (const script of schemaScripts) {
      try {
        const jsonStr = script.replace(/<script type="application\/ld\+json">/, '')
                             .replace(/<\/script>/, '')
                             .trim();
        const data = JSON.parse(jsonStr);
        
        // Handle array of schema objects
        const articles = Array.isArray(data) ? 
          data.filter(item => ['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type'])) :
          [data].filter(item => ['Article', 'BlogPosting', 'NewsArticle'].includes(item['@type']));
        
        if (articles.length > 0) {
          const result = schemaArticleSchema.safeParse(articles[0]);
          if (result.success) {
            return result.data;
          }
        }
      } catch (e) {
        console.error('Error parsing Schema.org script:', e);
      }
    }
  } catch (error) {
    console.error('Error extracting Schema.org data:', error);
  }
  
  return null;
}

export function getAuthorFromSchema(schema: SchemaArticle): string | null {
  if (!schema.author) return null;
  
  if (typeof schema.author === 'string') {
    return schema.author;
  }
  
  return schema.author.name || null;
}

export function getDateFromSchema(schema: SchemaArticle): Date | null {
  const dateStr = schema.datePublished || schema.dateModified;
  if (!dateStr) return null;
  
  try {
    return new Date(dateStr);
  } catch (error) {
    console.error('Error parsing date from Schema.org:', error);
    return null;
  }
}

export function getImageFromSchema(schema: SchemaArticle): string | null {
  if (!schema.image) return null;
  
  if (typeof schema.image === 'string') {
    return schema.image;
  }
  
  return schema.image.url || null;
} 