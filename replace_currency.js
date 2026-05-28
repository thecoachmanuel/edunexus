const fs = require('fs');

const files = [
  'src/components/finance/PayslipView.tsx',
  'src/components/finance/FinanceOverviewCards.tsx',
  'src/components/finance/SalaryDialog.tsx',
  'src/components/finance/RecordPaymentDialog.tsx',
  'src/app/(protected)/finance/my-fees/page.tsx',
  'src/app/(protected)/finance/salary/page.tsx',
  'src/app/(protected)/finance/expenses/page.tsx',
  'src/app/(protected)/finance/fees/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\$\$\{/g, '₦${');
  content = content.replace(/>\$/g, '>₦');
  content = content.replace(/\+\$/g, '+₦');
  content = content.replace(/-\$/g, '-₦');
  content = content.replace(/Max: \$/g, 'Max: ₦');
  content = content.replace(/Net Salary: \$/g, 'Net Salary: ₦');

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
