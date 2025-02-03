const { chromium } = require('playwright');

async function testScrapers() {
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
    // Test Clio
    console.log('Testing Clio blog...');
    await page.goto('https://www.clio.com/blog/legal-practice-management-software/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForSelector('article', {
      timeout: 10000
    });
    
    const clioData = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent?.trim();
      const content = Array.from(document.querySelectorAll('article p'))
        .map(p => p.textContent?.trim())
        .filter(text => text)
        .join('\n\n');
      return { title, contentLength: content.length, firstParagraph: content.slice(0, 100) + '...' };
    });
    
    console.log('Clio article:', clioData);
    
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
          contentLength: content.length, 
          firstParagraph: content.slice(0, 100) + '...',
          pageStructure
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
          contentLength: content.length, 
          firstParagraph: content.slice(0, 100) + '...',
          pageStructure
        };
      });
      
      console.log('LawPay article:', lawPayData);
    } else {
      console.log('Could not find LawPay article link');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testScrapers(); 