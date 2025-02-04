export function getSlugFromUrl(url: string): string {
  const path = url.split('/').pop() || '';
  return path.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
} 