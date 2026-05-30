const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'src', 'lib', 'models');

const modelsToUpdate = [
  'activitieslog.ts', 'attendance.ts', 'event.ts', 'exam.ts', 'expense.ts',
  'feeStructure.ts', 'gradingConfig.ts', 'material.ts', 'reportCard.ts',
  'salary.ts', 'studentFee.ts', 'studentResult.ts', 'subject.ts',
  'submission.ts', 'task.ts', 'timetable.ts'
];

modelsToUpdate.forEach(file => {
  const filePath = path.join(modelsDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Insert school into interface
  // Find "export interface I... extends Document {"
  const interfaceRegex = /(export interface I[a-zA-Z]+ extends Document \{)/;
  if (interfaceRegex.test(content) && !content.includes('school: mongoose.Types.ObjectId')) {
    content = content.replace(interfaceRegex, `$1\n  school: mongoose.Types.ObjectId;`);
  } else if (!content.includes('school: mongoose.Types.ObjectId')) {
    console.log(`Warning: Could not find interface in ${file}`);
  }

  // Insert school into schema
  // Find "const ...Schema = new Schema...({"
  const schemaRegex = /(const [a-zA-Z]+Schema = new Schema(?:<[^>]+>)?\(\s*\{)/;
  if (schemaRegex.test(content) && !content.includes('school: { type: Schema.Types.ObjectId, ref: "School"')) {
    content = content.replace(schemaRegex, `$1\n    school: { type: Schema.Types.ObjectId, ref: "School", required: true },`);
  } else if (!content.includes('school: { type: Schema.Types.ObjectId, ref: "School"')) {
    console.log(`Warning: Could not find schema in ${file}`);
  }

  // Add mongoose import if missing? All of them already import mongoose.
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
