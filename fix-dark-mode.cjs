const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.jsx')) {
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

    // 1. Fix low-contrast purple text on headings
    content = content.replace(/(?<=className="[^"]*?\b)text-purple-rich\b/g, 'text-purple-rich dark:text-gold-light');
    content = content.replace(/(?<=className={`[^`]*?\b)text-purple-rich\b/g, 'text-purple-rich dark:text-gold-light');

    content = content.replace(/(?<=className="[^"]*?\b)text-purple-darkest\b/g, 'text-purple-darkest dark:text-cream-soft');
    content = content.replace(/(?<=className={`[^`]*?\b)text-purple-darkest\b/g, 'text-purple-darkest dark:text-cream-soft');

    content = content.replace(/(?<=className="[^"]*?\b)text-purple-dark\b/g, 'text-purple-dark dark:text-cream-dark');
    content = content.replace(/(?<=className={`[^`]*?\b)text-purple-dark\b/g, 'text-purple-dark dark:text-cream-dark');

    // 2. Fix thin/faint text in dark mode on inverted light sections like "Our Story"
    content = content.replace(/text-cream-soft\/[0-9]+/g, 'text-cream-soft');
    content = content.replace(/text-cream-dark\/[0-9]+/g, 'text-cream-dark');
    content = content.replace(/text-cream\/[0-9]+/g, 'text-cream');

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedFiles++;
    }
});

console.log('Fixed text contrast specifically for dark mode in files:', changedFiles);
