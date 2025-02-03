import { sql } from '@vercel/postgres';
export async function getAllPosts() {
    const { rows } = await sql `
    SELECT * FROM blog_posts 
    ORDER BY published_at DESC
  `;
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        summary: row.summary,
        url: row.url,
        imageUrl: row.image_url,
        publishedAt: new Date(row.published_at),
        source: row.source,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    }));
}
export async function savePost(post) {
    await sql `
    INSERT INTO blog_posts (
      id, title, content, summary, url, image_url, 
      published_at, source, created_at, updated_at
    ) VALUES (
      ${post.id}, ${post.title}, ${post.content}, 
      ${post.summary}, ${post.url}, ${post.imageUrl},
      ${post.publishedAt.toISOString()}, ${post.source},
      ${post.createdAt.toISOString()}, ${post.updatedAt.toISOString()}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      summary = EXCLUDED.summary,
      image_url = EXCLUDED.image_url,
      updated_at = EXCLUDED.updated_at
  `;
}
export async function saveGeneratedPost(post) {
    await sql `
    INSERT INTO generated_posts (
      id, title, content, summary, image_url,
      source_references, status, created_at
    ) VALUES (
      ${post.id}, ${post.title}, ${post.content},
      ${post.summary}, ${post.imageUrl},
      ${JSON.stringify(post.sourceReferences)}, ${post.status},
      ${post.createdAt.toISOString()}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      summary = EXCLUDED.summary,
      image_url = EXCLUDED.image_url,
      source_references = EXCLUDED.source_references,
      status = EXCLUDED.status
  `;
}
export async function getLatestGeneratedPosts(limit = 10) {
    const { rows } = await sql `
    SELECT * FROM generated_posts 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `;
    return rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        summary: row.summary,
        imageUrl: row.image_url,
        sourceReferences: row.source_references,
        status: row.status,
        createdAt: new Date(row.created_at)
    }));
}
// Initialize database tables
export async function initializeDatabase() {
    await sql `
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      url TEXT NOT NULL,
      image_url TEXT,
      published_at TIMESTAMP WITH TIME ZONE NOT NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `;
    await sql `
    CREATE TABLE IF NOT EXISTS generated_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      image_url TEXT,
      source_references JSONB NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `;
}
// Export the database functions
export const db = {
    getAllPosts,
    savePost,
    saveGeneratedPost,
    getLatestGeneratedPosts,
    initializeDatabase,
};
