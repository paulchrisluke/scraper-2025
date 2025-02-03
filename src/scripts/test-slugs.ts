import { getSlugFromUrl } from '../lib/utils/slug';

const testUrls = [
  'https://www.clio.com/blog/legal-practice-management-software/',
  'https://www.mycase.com/blog/2024/02/law-firm-marketing-guide/',
  'https://www.lawpay.com/about/blog/best-legal-billing-practices/'
];

console.log('Testing URL slug extraction:\n');
testUrls.forEach(url => {
  const slug = getSlugFromUrl(url);
  console.log(`URL: ${url}`);
  console.log(`Slug: ${slug}\n`);
}); 