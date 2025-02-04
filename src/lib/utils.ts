export function getSlugFromUrl(url: string): string {
  return url
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-zA-Z0-9-]/g, '-')
    .toLowerCase() || 
    Math.random().toString(36).substring(7);
} 