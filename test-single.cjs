const { chromium } = require('playwright');

async function testLawPayScraper() {
  const browser = await chromium.launch({
    headless: false
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  });
  
  const page = await context.newPage();
  
  try {
    console.log('Starting LawPay blog scrape...');
    
    // Start with the blog index page
    await page.goto('https://www.lawpay.com/about/blog/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('Blog index page loaded, gathering article links...');
    
    // Get all article links from the blog index
    const articleLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/blog/"]'))
        .map(link => {
          const href = link.getAttribute('href');
          if (!href) return null;
          return href.startsWith('http') ? href : `https://www.lawpay.com${href}`;
        })
        .filter(href => 
          href && 
          href.includes('/blog/') &&
          !href.endsWith('/blog/') &&
          !href.includes('/category/') &&
          !href.includes('/tag/') &&
          !href.includes('/author/')
        );
    });
    
    console.log(`Found ${articleLinks.length} article links`);
    
    // Process first article
    if (articleLinks.length > 0) {
      const url = articleLinks[0];
      console.log(`Processing article at ${url}`);
      
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Wait for any content to be visible
      console.log('Waiting for content...');
      await page.waitForTimeout(5000); // Give the page time to fully render
      
      const data = await page.evaluate(() => {
        // Try to find the title
        const titleSelectors = ['h1', '.post-title', '.entry-title', '.blog-title h1', 'article h1'];
        let title = null;
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            title = element.textContent?.trim();
            if (title) break;
          }
        }
        
        // Try to find the date
        const dateSelectors = ['.post-date', '.published-date', 'time', '.entry-date', '.date'];
        let dateStr = null;
        for (const selector of dateSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            dateStr = element.textContent?.trim();
            if (dateStr) break;
          }
        }
        
        // Try to find the content
        const contentSelectors = [
          '.post-content p',
          '.entry-content p',
          '.blog-content p',
          'article p',
          '.post p',
          'main p'
        ];
        
        let content = '';
        for (const selector of contentSelectors) {
          const paragraphs = Array.from(document.querySelectorAll(selector))
            .map(p => p.textContent?.trim())
            .filter(text => text);
          
          if (paragraphs.length > 0) {
            content = paragraphs.join('\n\n');
            break;
          }
        }
        
        // Take a snapshot of the page structure
        const pageStructure = {
          hasH1: document.querySelector('h1') !== null,
          hasArticle: document.querySelector('article') !== null,
          hasMain: document.querySelector('main') !== null,
          classes: Array.from(document.body.classList),
          articleClasses: Array.from(document.querySelector('article')?.classList || []),
          mainClasses: Array.from(document.querySelector('main')?.classList || [])
        };
        
        return { 
          title, 
          dateStr,
          contentLength: content.length, 
          firstParagraph: content.slice(0, 100) + '...',
          pageStructure
        };
      });
      
      console.log('Article data:', data);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testLawPayScraper(); 