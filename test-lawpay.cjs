const { chromium } = require('playwright');

async function testLawPayScraper() {
  let browser = null;
  let context = null;
  let page = null;
  
  try {
    browser = await chromium.launch({
      headless: false
    });
    
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2
    });
    
    page = await context.newPage();
    
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
      
      // Take a snapshot of the page structure before extraction
      const structure = await page.evaluate(() => {
        // Get all text nodes in the article
        const textNodes = [];
        const walker = document.createTreeWalker(
          document.querySelector('article'),
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim();
          if (text) {
            const parent = node.parentElement;
            textNodes.push({
              text,
              parentTag: parent.tagName.toLowerCase(),
              parentClasses: Array.from(parent.classList),
              parentId: parent.id,
              grandparentTag: parent.parentElement?.tagName.toLowerCase(),
              grandparentClasses: Array.from(parent.parentElement?.classList || [])
            });
          }
        }
        
        return {
          bodyClasses: Array.from(document.body.classList),
          mainTags: Array.from(document.querySelectorAll('main')).map(el => ({
            classes: Array.from(el.classList),
            id: el.id,
            children: Array.from(el.children).map(child => ({
              tag: child.tagName.toLowerCase(),
              classes: Array.from(child.classList)
            }))
          })),
          articleTags: Array.from(document.querySelectorAll('article')).map(el => ({
            classes: Array.from(el.classList),
            id: el.id,
            children: Array.from(el.children).map(child => ({
              tag: child.tagName.toLowerCase(),
              classes: Array.from(child.classList)
            }))
          })),
          h1Tags: Array.from(document.querySelectorAll('h1')).map(el => ({
            text: el.textContent?.trim(),
            classes: Array.from(el.classList),
            id: el.id,
            parentClasses: Array.from(el.parentElement?.classList || [])
          })),
          textNodes: textNodes.slice(0, 20) // Get first 20 text nodes for analysis
        };
      });
      
      console.log('Page structure:', JSON.stringify(structure, null, 2));
      
      const data = await page.evaluate(() => {
        // Try to find the title with LawPay-specific selectors first
        const titleSelectors = [
          'div.px-4 h1',
          'h1',
          '.entry-title',
          '.post-title',
          '.blog-title'
        ];
        let title = null;
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            title = element.textContent?.trim();
            if (title) break;
          }
        }
        
        // Try to find the date with exact Tailwind selectors
        const dateSelectors = [
          'div.ml-4 > div.font-bold.text-xs',
          'div.ml-4 > div.text-xs.font-bold',
          // Fallback to standard selectors
          'meta[property="article:published_time"]',
          'meta[property="og:article:published_time"]',
          '.post-meta time',
          '.meta-date'
        ];
        
        let dateStr = null;
        for (const selector of dateSelectors) {
          let element = document.querySelector(selector);
          if (element) {
            if (element.tagName.toLowerCase() === 'meta') {
              dateStr = element.getAttribute('content');
            } else {
              dateStr = element.textContent?.trim() || element.getAttribute('datetime');
            }
            if (dateStr) break;
          }
        }
        
        // Try to find the author with exact Tailwind selectors
        const authorSelectors = [
          'div.ml-4 > div.font-light.text-sm',
          'div.ml-4 > div.text-sm.font-light',
          // Fallback to standard selectors
          'meta[name="author"]',
          '[itemprop="author"]',
          '.author-name'
        ];
        
        let author = null;
        for (const selector of authorSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element.tagName.toLowerCase() === 'meta') {
              author = element.getAttribute('content');
            } else {
              author = element.textContent?.trim();
            }
            if (author) break;
          }
        }
        
        // Try to find the category with exact Tailwind selectors
        const categorySelectors = [
          'p.uppercase.tracking-wider.font-normal.text-xs',
          'p.text-xs.uppercase.tracking-wider',
          // Fallback to standard selectors
          '.post-categories',
          '.blog-categories',
          '.entry-categories'
        ];
        
        let categories = [];
        for (const selector of categorySelectors) {
          const element = document.querySelector(selector);
          if (element) {
            const category = element.textContent?.trim();
            if (category) {
              categories.push(category);
              break;
            }
          }
        }
        
        // Try to find the content with exact Tailwind selectors
        const contentSelectors = [
          'div.markdown p',
          'article.flex.mx-auto p',
          'div.px-4 p',
          // Fallback to standard selectors
          '.entry-content p',
          'article .post-content p',
          '.blog-content p'
        ];
        
        let content = '';
        let paragraphs = [];
        for (const selector of contentSelectors) {
          paragraphs = Array.from(document.querySelectorAll(selector))
            .map(p => p.textContent?.trim())
            .filter(text => text && 
              !text.includes('©') && // Filter out copyright notices
              !text.includes('All rights reserved') &&
              text.length > 10 // Filter out very short paragraphs that might be metadata
            );
          
          if (paragraphs.length > 0) {
            content = paragraphs.join('\n\n');
            break;
          }
        }
        
        // Try to find meta description
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                        document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        
        // Try to find featured image
        const imageUrl = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                        document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
        
        return {
          title,
          author,
          dateStr,
          categories,
          content,
          metaDescription: metaDesc,
          imageUrl,
          contentLength: content.length,
          paragraphCount: paragraphs.length
        };
      });
      
      console.log('Article data:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

testLawPayScraper(); 