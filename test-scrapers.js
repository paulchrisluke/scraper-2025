import { scrapeClioBlog } from './src/lib/scrapers/clio.js';
import { scrapeMyCaseBlog } from './src/lib/scrapers/mycase.js';
import { scrapeLawPayBlog } from './src/lib/scrapers/lawpay.js';

async function testScrapers() {
  try {
    console.log('Testing Clio scraper...');
    const clioPosts = await scrapeClioBlog();
    console.log(`Clio posts: ${clioPosts.length}`);
    
    console.log('\nTesting MyCase scraper...');
    const myCasePosts = await scrapeMyCaseBlog();
    console.log(`MyCase posts: ${myCasePosts.length}`);
    
    console.log('\nTesting LawPay scraper...');
    const lawPayPosts = await scrapeLawPayBlog();
    console.log(`LawPay posts: ${lawPayPosts.length}`);
    
    const totalPosts = clioPosts.length + myCasePosts.length + lawPayPosts.length;
    console.log(`\nTotal posts scraped: ${totalPosts}`);
    
    // Print sample posts
    if (clioPosts.length > 0) {
      console.log('\nSample Clio post:', {
        title: clioPosts[0].title,
        url: clioPosts[0].url,
        contentLength: clioPosts[0].content.length
      });
    }
    
    if (myCasePosts.length > 0) {
      console.log('\nSample MyCase post:', {
        title: myCasePosts[0].title,
        url: myCasePosts[0].url,
        contentLength: myCasePosts[0].content.length
      });
    }
    
    if (lawPayPosts.length > 0) {
      console.log('\nSample LawPay post:', {
        title: lawPayPosts[0].title,
        url: lawPayPosts[0].url,
        contentLength: lawPayPosts[0].content.length
      });
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testScrapers(); 