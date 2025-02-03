/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['cheerio'],
  images: {
    domains: ['oaidalleapiprodscus.blob.core.windows.net'], // For DALL-E generated images
  },
}

export default nextConfig; 