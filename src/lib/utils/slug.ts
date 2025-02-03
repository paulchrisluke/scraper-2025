export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim(); // Remove leading/trailing spaces
}

export function getSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const segments = path.split('/').filter(Boolean);
    return segments[segments.length - 1] || '';
  } catch (error) {
    // If URL parsing fails, try to extract the last path segment directly
    const segments = url.split('/').filter(Boolean);
    return segments[segments.length - 1] || '';
  }
} 