const fs = require('fs');
const path = require('path');

function updateFile(file, replacer) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = replacer(content);
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated: ' + file);
  }
}

// 1. ExpenseDialog.tsx
updateFile('src/components/finance/ExpenseDialog.tsx', content => {
  if (!content.includes('useAuth')) {
    content = content.replace('import { toast } from "sonner";', 'import { toast } from "sonner";\nimport { useAuth } from "@/hooks/AuthProvider";');
  }
  content = content.replace('export function ExpenseDialog({ onSave }: { onSave: () => void }) {', 'export function ExpenseDialog({ onSave }: { onSave: () => void }) {\n  const { year } = useAuth();');
  content = content.replace('academicYear: "664684a22b79a9bd12345678"', 'academicYear: year?._id');
  return content;
});

// 2. FeeStructureDialog.tsx
updateFile('src/components/finance/FeeStructureDialog.tsx', content => {
  if (!content.includes('useAuth')) {
    content = content.replace('import { toast } from "sonner";', 'import { toast } from "sonner";\nimport { useAuth } from "@/hooks/AuthProvider";');
  }
  content = content.replace('export function FeeStructureDialog({ feeStructure, onSave }: { feeStructure?: any, onSave: () => void }) {', 'export function FeeStructureDialog({ feeStructure, onSave }: { feeStructure?: any, onSave: () => void }) {\n  const { year } = useAuth();');
  content = content.replace('academicYear: "664684a22b79a9bd12345678"', 'academicYear: year?._id');
  return content;
});

// 3. SalaryDialog.tsx
updateFile('src/components/finance/SalaryDialog.tsx', content => {
  if (!content.includes('useAuth')) {
    content = content.replace('import { toast } from "sonner";', 'import { toast } from "sonner";\nimport { useAuth } from "@/hooks/AuthProvider";');
  }
  content = content.replace('export function SalaryDialog({ onSave }: { onSave: () => void }) {', 'export function SalaryDialog({ onSave }: { onSave: () => void }) {\n  const { year } = useAuth();');
  content = content.replace('academicYear: "664684a22b79a9bd12345678"', 'academicYear: year?._id');
  
  // Also add limit=1000 to the API calls
  content = content.replace('api.get("/users?role=teacher")', 'api.get("/users?role=teacher&limit=1000")');
  content = content.replace('api.get("/users?role=admin")', 'api.get("/users?role=admin&limit=1000")');
  
  return content;
});

console.log('Done!');
