const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.jsx') || filePath.endsWith('.css')) {
            results.push(filePath);
        }
    });
    return results;
}

const files = walk('src');
let changedFiles = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // For CSS: replace @apply bg-white with @apply bg-white dark:bg-charcoal-mid
    if (file.endsWith('.css')) {
        content = content.replace(/@apply bg-white /g, '@apply bg-white dark:bg-charcoal-mid ');
    }

    // For JSX: replace bg-white with bg-white dark:bg-charcoal-mid when used in className string
    if (file.endsWith('.jsx')) {
        content = content.replace(/(?<=className="[^"]*?\b)bg-white\b/g, 'bg-white dark:bg-charcoal-mid');
        content = content.replace(/(?<=className={`[^`]*?\b)bg-white\b/g, 'bg-white dark:bg-charcoal-mid');
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedFiles++;
    }
});

console.log('Fixed bg-white in files:', changedFiles);
