import re

with open("src/app/page.tsx", "r") as f:
    content = f.read()

replacements = [
    (r'bg-\[\#0a0a0f\]', r'bg-slate-50 dark:bg-[#0a0a0f]'),
    (r'text-white', r'text-slate-900 dark:text-white'),
    (r'text-white/([0-9]+)', lambda m: f'text-slate-{1000 - int(m.group(1))*10} dark:text-white/{m.group(1)}'),
    (r'border-white/([0-9]+)', lambda m: f'border-slate-{100 + int(m.group(1))*10} dark:border-white/{m.group(1)}'),
    (r'bg-white/\[([0-9.]+)\]', r'bg-slate-100 dark:bg-white/[\1]'),
]

for pattern, repl in replacements:
    content = re.sub(pattern, repl, content)

# Specific fixes:
content = content.replace("bg-gradient-to-r from-white to-white/70", "bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/70")
content = content.replace("text-slate-900 dark:text-white text-sm font-semibold", "text-white text-sm font-semibold") # keep buttons white text
content = content.replace("text-slate-900 dark:text-white font-bold", "text-white font-bold") # keep ctas white
content = content.replace("border-slate-200 text-slate-300 dark:text-white/70", "border-slate-300 dark:border-white/10 text-slate-600 dark:text-white/70")

with open("src/app/page.tsx", "w") as f:
    f.write(content)
