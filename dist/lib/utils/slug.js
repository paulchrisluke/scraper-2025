export function createSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim(); // Remove leading/trailing spaces
}
export function getSlugFromUrl(url) {
    const path = new URL(url).pathname;
    return path.split('/').filter(Boolean).pop() || '';
}
