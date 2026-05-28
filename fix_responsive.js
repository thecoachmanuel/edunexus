const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else if (filepath.endsWith('.tsx')) {
      callback(filepath);
    }
  });
}

function updateFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;

  // 1. Page paddings
  content = content.replace(/className="p-6 space-y-6"/g, 'className="p-4 md:p-6 space-y-4 md:space-y-6"');
  
  // 2. Headers
  content = content.replace(/className="flex items-center justify-between"/g, 'className="flex flex-col md:flex-row md:items-center justify-between gap-4"');

  // 3. Grids in forms
  content = content.replace(/className="grid grid-cols-2 gap-4"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-4"');
  content = content.replace(/className="grid grid-cols-2 gap-4 w-full"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"');
  content = content.replace(/className="grid grid-cols-2 gap-3"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-3"');
  content = content.replace(/className="grid grid-cols-2 gap-2"/g, 'className="grid grid-cols-1 md:grid-cols-2 gap-2"');
  content = content.replace(/className="grid grid-cols-3 gap-4 border-t pt-4 mt-4"/g, 'className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 mt-4"');

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Updated: ' + filepath);
  }
}

['src/app', 'src/components'].forEach(dir => walk(dir, updateFile));
console.log('Done!');
