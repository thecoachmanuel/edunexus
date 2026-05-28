const fs = require('fs');

const files = [
  'src/app/(protected)/finance/fees/page.tsx',
  'src/app/(protected)/finance/expenses/page.tsx',
  'src/app/(protected)/finance/salary/page.tsx',
  'src/app/(protected)/finance/my-fees/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Add overflow-x-auto to table wrappers
  content = content.replace(/className="border rounded-lg"/g, 'className="border rounded-lg overflow-x-auto"');

  // Fix header flex container
  content = content.replace(/className="flex justify-between items-center"/g, 'className="flex flex-col sm:flex-row justify-between sm:items-center gap-4"');
  content = content.replace(/className="flex items-center justify-between mb-6"/g, 'className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4"');

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
