# Legal Tech Blog Scraper

A Next.js application that scrapes legal technology blog content from leading platforms, generates AI-powered blog posts, and provides an RSS feed for content syndication.

## Features

- Daily scraping of latest blog posts from:
  - Clio Blog
  - MyCase Blog
  - LawPay Blog
- AI-powered content generation using OpenAI GPT-4
- AI image generation using DALL-E 3
- RSS/Atom/JSON feed endpoints
- Vercel KV storage for article data
- Automated daily content generation
- API key authentication

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/legal-tech-scraper.git
cd legal-tech-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
OPENAI_API_KEY=your_openai_api_key
RSS_API_KEY=your_rss_api_key
GENERATE_API_KEY=your_generate_api_key
CRON_SECRET=your_cron_secret
```

4. Deploy to Vercel:
```bash
vercel deploy
```

## API Endpoints

### RSS Feed
- GET `/api/rss`
- Headers: `x-api-key: your_rss_api_key`
- Supports content negotiation for RSS/Atom/JSON formats

### Generate Article
- POST `/api/generate/article`
- Headers: `x-api-key: your_generate_api_key`
- Generates a new blog post using AI

### Cron Jobs
- Daily scraping at midnight UTC
- Daily content generation at noon UTC

## Development

1. Run the development server:
```bash
npm run dev
```

2. Run tests:
```bash
npm test
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
