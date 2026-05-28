const fs = require('fs');

const replaceInFile = (file) => {
  let content = fs.readFileSync(file, 'utf8');

  // Change URLs
  content = content.replace(/\/lms\/exams/g, '/lms/quizzes');

  // Change Component names and imports
  content = content.replace(/ExamRadio/g, 'QuizRadio');
  content = content.replace(/ExamGenerator/g, 'QuizGenerator');

  // Change UI text (Assignments -> Quizzes)
  content = content.replace(/Assignments/g, 'Quizzes');
  content = content.replace(/Assignment/g, 'Quiz');

  // Change specific UI Texts from Exam -> Quiz
  content = content.replace(/Exam Results/g, 'Quiz Results');
  content = content.replace(/Active Exams/g, 'Active Quizzes');
  content = content.replace(/Next Exam/g, 'Next Quiz');
  content = content.replace(/Exam Unavailable/g, 'Quiz Unavailable');
  content = content.replace(/This exam is currently closed/g, 'This quiz is currently closed');
  content = content.replace(/Submit Exam/g, 'Submit Quiz');
  content = content.replace(/Publish Exam/g, 'Publish Quiz');
  content = content.replace(/Unpublish Exam/g, 'Unpublish Quiz');
  content = content.replace(/Delete Exam/g, 'Delete Quiz');
  content = content.replace(/Back to Exams/g, 'Back to Quizzes');
  content = content.replace(/Exam deleted/g, 'Quiz deleted');
  content = content.replace(/Exam submitted/g, 'Quiz submitted');
  content = content.replace(/AI is generating the exam/g, 'AI is generating the quiz');
  content = content.replace(/Generate Exam/g, 'Generate Quiz');
  content = content.replace(/Create Exam/g, 'Create Quiz');
  content = content.replace(/Exams/g, 'Quizzes');
  // Avoid replacing api endpoints by not globally replacing "exam" or "Exam" if not necessary.
  // We can rename the React component Name in page.tsx from `const Exam = ...` to `const Quiz = ...`
  content = content.replace(/const Exam =/g, 'const Quiz =');
  content = content.replace(/export default Exam;/g, 'export default Quiz;');

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
};

const files = [
  'src/components/sidebar/AppSidebar.tsx',
  'src/components/lms/QuizRadio.tsx',
  'src/components/lms/QuizGenerator.tsx',
  'src/app/(protected)/lms/quizzes/page.tsx',
  'src/app/(protected)/lms/quizzes/[id]/page.tsx',
  'src/components/dashboard/dashboard-stats.tsx',
  'src/components/lms/QuestionEditor.tsx'
];

files.forEach(replaceInFile);
