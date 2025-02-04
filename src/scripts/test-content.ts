// @ts-nocheck
// This file is only used in development
import { scrapeClioBlog } from '../lib/scrapers/clio.js';
import { scrapeMyCaseBlog } from '../lib/scrapers/mycase.js';
import { scrapeLawPayBlog } from '../lib/scrapers/lawpay.js';
import * as fs from 'fs/promises';

async function testScrapers() {
  console.log('Testing Clio scraper...');
  const clioArticles = await scrapeClioBlog();
  console.log(`Found ${clioArticles.length} Clio articles`);

  console.log('\nTesting MyCase scraper...');
  const myCaseArticles = await scrapeMyCaseBlog();
  console.log(`Found ${myCaseArticles.length} MyCase articles`);

  console.log('\nTesting LawPay scraper...');
  const lawPayArticles = await scrapeLawPayBlog();
  console.log(`Found ${lawPayArticles.length} LawPay articles`);

  const results = {
    clio: clioArticles,
    myCase: myCaseArticles,
    lawPay: lawPayArticles
  };

  await fs.writeFile('test-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults written to test-results.json');
}

// Only run if called directly
if (require.main === module) {
  testScrapers().catch(console.error);
} 