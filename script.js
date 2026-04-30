const fs = require('fs');
const path = require('path');

const files = [
  'app/page.tsx',
  'components/Header.tsx',
  'components/BottomNav.tsx',
  'components/EditTaskModal.tsx',
  'components/FeedbackModal.tsx',
  'app/admin/page.tsx',
  'app/settings/page.tsx'
];

function convert(content) {
  return content
    .replace(/bg-transparent/g, '@@bg-transparent')
    .replace(/bg-\[\#11141A\]/g, 'bg-white dark:bg-[#11141A]')
    .replace(/bg-\[\#1A1D23\]/g, 'bg-gray-50 dark:bg-[#1A1D23]')
    .replace(/bg-\[\#0B0D10\]/g, 'bg-gray-100 dark:bg-[#0B0D10]')
    .replace(/border-\[\#1F2937\]/g, 'border-gray-200 dark:border-[#1F2937]')
    .replace(/border-\[\#2D3139\]/g, 'border-gray-300 dark:border-[#2D3139]')
    // Avoid replacing text-white inside buttons (heuristic: usually indigo or other bg)
    .replace(/text-gray-300/g, 'text-gray-700 dark:text-gray-300')
    .replace(/text-gray-400/g, 'text-gray-600 dark:text-gray-400')
    .replace(/text-gray-200/g, 'text-gray-800 dark:text-gray-200')
    // Revert safety token
    .replace(/@@bg-transparent/g, 'bg-transparent');
}

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    content = convert(content);
    fs.writeFileSync(p, content, 'utf8');
  }
});
console.log('done');
