const fs = require('fs');
const file = 'src/app/(protected)/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove ClassLeaderboardWidget from the left column
content = content.replace(/\s*\{\/\* CLASS LEADERBOARD WIDGET \(Right side\) \*\/\}\s*<div className="h-full">\s*<ClassLeaderboardWidget data=\{statsData\?\.leaderboard\} \/>\s*<\/div>/, '');

// If it's an admin, we only show Recent Activity, so we should change md:grid-cols-2 to grid-cols-1 for that container?
// Currently: <div className={`grid gap-4 ${user?.role === "admin" ? "md:grid-cols-2" : "grid-cols-1"}`}>
// Since ClassLeaderboard is gone from here, Recent Activity will take full width. That's fine, or we can just change it to grid-cols-1.
content = content.replace('user?.role === "admin" ? "md:grid-cols-2" : "grid-cols-1"', '"grid-cols-1"');

// Add ClassLeaderboardWidget below AttendanceWidget
content = content.replace(
  '{/* ATTENDANCE WIDGET */}\n          <AttendanceWidget role={user?.role} />\n        </div>',
  '{/* ATTENDANCE WIDGET */}\n          <AttendanceWidget role={user?.role} />\n\n          {/* CLASS LEADERBOARD WIDGET */}\n          <ClassLeaderboardWidget data={statsData?.leaderboard} />\n        </div>'
);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated layout");
