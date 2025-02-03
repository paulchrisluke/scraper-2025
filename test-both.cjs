const { chromium } = require('playwright');

async function testScrapers() {
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
    
    // Test MyCase
    console.log('\nTesting MyCase blog...');
    await page.goto('https://www.mycase.com/blog/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Handle cookie consent dialog
    try {
      console.log('Looking for cookie consent dialog...');
      const dialogSelector = '.osano-cm-window';
      await page.waitForSelector(dialogSelector, { timeout: 5000 });
      console.log('Found cookie dialog');
      
      const acceptButton = await page.waitForSelector('.osano-cm-accept-all', { timeout: 5000 });
      if (acceptButton) {
        console.log('Found accept button, clicking...');
        await acceptButton.click();
        await page.waitForTimeout(2000);
        
        // Wait for dialog to disappear
        await page.waitForSelector(dialogSelector, { state: 'hidden', timeout: 5000 });
        console.log('Cookie dialog closed');
      }
    } catch (error) {
      console.log('No cookie consent dialog found or could not interact with it:', error.message);
    }
    
    // Get first article link
    console.log('Looking for article links...');
    const myCaseArticleUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/blog/"]'))
        .map(link => link.getAttribute('href'))
        .filter(href => 
          href && 
          href.includes('/blog/') &&
          !href.endsWith('/blog/') &&
          !href.includes('/category/') &&
          !href.includes('/tag/') &&
          !href.includes('/author/')
        );
      return links[0];
    });
    
    if (myCaseArticleUrl) {
      console.log('Found MyCase article:', myCaseArticleUrl);
      await page.goto(myCaseArticleUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Wait for any content to be visible
      console.log('Waiting for content...');
      await page.waitForTimeout(5000); // Give the page time to fully render
      
      const myCaseData = await page.evaluate(() => {
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
        
        // Enhanced date selectors
        const dateSelectors = [
          '.post-date', 
          '.published-date', 
          'time', 
          '.entry-date', 
          '.date',
          'meta[property="article:published_time"]',
          'meta[property="og:article:published_time"]',
          '.post-meta time',
          '.meta-date',
          '.article-date',
          '.blog-date',
          '[itemprop="datePublished"]',
          '.post-info time',
          '.post-meta .date'
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
        
        // Try to find the author
        const authorSelectors = [
          '.author-name',
          '.post-author',
          '[itemprop="author"]',
          '.entry-author',
          '.blog-author',
          'meta[name="author"]',
          '.post-meta .author',
          '.author-bio h3'
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
        
        // Try to find the content with enhanced selectors
        const contentSelectors = [
          '.post-content p',
          '.entry-content p',
          '.blog-content p',
          'article p',
          '.post p',
          'main p',
          '[itemprop="articleBody"] p',
          '.article-content p',
          '.content-area p'
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
        
        // Try to find categories/tags
        const categorySelectors = [
          '.post-categories a',
          '.blog-categories a',
          '.entry-categories a',
          '.post-tags a',
          '.blog-tags a'
        ];
        
        let categories = [];
        for (const selector of categorySelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            categories = Array.from(elements)
              .map(el => el.textContent?.trim())
              .filter(text => text);
            if (categories.length > 0) break;
          }
        }
        
        // Try to find Schema.org data
        let schemaData = null;
        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
        if (schemaScripts.length > 0) {
          try {
            for (const script of schemaScripts) {
              const data = JSON.parse(script.textContent);
              if (data['@type'] === 'Article' || data['@type'] === 'BlogPosting') {
                schemaData = data;
                break;
              }
              // Handle array of schema objects
              if (Array.isArray(data)) {
                const article = data.find(item => 
                  item['@type'] === 'Article' || 
                  item['@type'] === 'BlogPosting'
                );
                if (article) {
                  schemaData = article;
                  break;
                }
              }
            }
          } catch (e) {
            console.error('Error parsing Schema.org data:', e);
          }
        }
        
        // Use Schema.org data if available
        if (schemaData) {
          if (!dateStr) dateStr = schemaData.datePublished || schemaData.dateModified;
          if (!author) {
            const schemaAuthor = schemaData.author;
            if (schemaAuthor) {
              author = typeof schemaAuthor === 'string' ? 
                schemaAuthor : 
                schemaAuthor.name || schemaAuthor.givenName;
            }
          }
          if (!title) title = schemaData.headline || schemaData.name;
        }
        
        // Try to find meta description
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                        document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        
        return { 
          title,
          author,
          dateStr,
          categories,
          contentLength: content.length,
          paragraphCount: paragraphs.length,
          firstParagraph: content.slice(0, 100) + '...',
          hasSchema: !!schemaData,
          schemaType: schemaData ? schemaData['@type'] : null,
          metaDescription: metaDesc
        };
      });
      
      console.log('MyCase article:', myCaseData);
    } else {
      console.log('Could not find MyCase article link');
    }
    
    // Test LawPay
    console.log('\nTesting LawPay blog...');
    await page.goto('https://www.lawpay.com/about/blog/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Get first article link
    console.log('Looking for LawPay article links...');
    const lawPayArticleUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/blog/"]'))
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
      return links[0];
    });
    
    if (lawPayArticleUrl) {
      console.log('Found LawPay article:', lawPayArticleUrl);
      await page.goto(lawPayArticleUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Wait for any content to be visible
      console.log('Waiting for content...');
      await page.waitForTimeout(5000); // Give the page time to fully render
      
      const lawPayData = await page.evaluate(() => {
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
        
        // Enhanced date selectors
        const dateSelectors = [
          '.post-date', 
          '.published-date', 
          'time', 
          '.entry-date', 
          '.date',
          'meta[property="article:published_time"]',
          'meta[property="og:article:published_time"]',
          '.post-meta time',
          '.meta-date',
          '.article-date',
          '.blog-date',
          '[itemprop="datePublished"]',
          '.post-info time',
          '.post-meta .date'
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
        
        // Try to find the author
        const authorSelectors = [
          '.author-name',
          '.post-author',
          '[itemprop="author"]',
          '.entry-author',
          '.blog-author',
          'meta[name="author"]',
          '.post-meta .author',
          '.author-bio h3'
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
        
        // Try to find the content with enhanced selectors
        const contentSelectors = [
          '.post-content p',
          '.entry-content p',
          '.blog-content p',
          'article p',
          '.post p',
          'main p',
          '[itemprop="articleBody"] p',
          '.article-content p',
          '.content-area p'
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
        
        // Try to find categories/tags
        const categorySelectors = [
          '.post-categories a',
          '.blog-categories a',
          '.entry-categories a',
          '.post-tags a',
          '.blog-tags a'
        ];
        
        let categories = [];
        for (const selector of categorySelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            categories = Array.from(elements)
              .map(el => el.textContent?.trim())
              .filter(text => text);
            if (categories.length > 0) break;
          }
        }
        
        // Try to find Schema.org data
        let schemaData = null;
        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
        if (schemaScripts.length > 0) {
          try {
            for (const script of schemaScripts) {
              const data = JSON.parse(script.textContent);
              if (data['@type'] === 'Article' || data['@type'] === 'BlogPosting') {
                schemaData = data;
                break;
              }
              // Handle array of schema objects
              if (Array.isArray(data)) {
                const article = data.find(item => 
                  item['@type'] === 'Article' || 
                  item['@type'] === 'BlogPosting'
                );
                if (article) {
                  schemaData = article;
                  break;
                }
              }
            }
          } catch (e) {
            console.error('Error parsing Schema.org data:', e);
          }
        }
        
        // Use Schema.org data if available
        if (schemaData) {
          if (!dateStr) dateStr = schemaData.datePublished || schemaData.dateModified;
          if (!author) {
            const schemaAuthor = schemaData.author;
            if (schemaAuthor) {
              author = typeof schemaAuthor === 'string' ? 
                schemaAuthor : 
                schemaAuthor.name || schemaAuthor.givenName;
            }
          }
          if (!title) title = schemaData.headline || schemaData.name;
        }
        
        // Try to find meta description
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                        document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        
        return { 
          title,
          author,
          dateStr,
          categories,
          contentLength: content.length,
          paragraphCount: paragraphs.length,
          firstParagraph: content.slice(0, 100) + '...',
          hasSchema: !!schemaData,
          schemaType: schemaData ? schemaData['@type'] : null,
          metaDescription: metaDesc
        };
      });
      
      console.log('LawPay article:', lawPayData);
    } else {
      console.log('Could not find LawPay article link');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

testScrapers(); 