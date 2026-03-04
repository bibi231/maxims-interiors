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

    // Reverse the previous mistake: `bg-white dark:bg-charcoal-mid` 
    // Since variables invert, bg-white should actually become bg-card for proper light/dark switching.
    if (file.endsWith('.css')) {
        content = content.replace(/@apply bg-white dark:bg-charcoal-mid /g, '@apply bg-card ');
        content = content.replace(/@apply bg-white /g, '@apply bg-card ');
    }

    if (file.endsWith('.jsx')) {
        content = content.replace(/bg-white dark:bg-charcoal-mid/g, 'bg-card');
        content = content.replace(/(?<=className="[^"]*?\b)bg-white\b/g, 'bg-card');
        content = content.replace(/(?<=className={`[^`]*?\b)bg-white\b/g, 'bg-card');
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedFiles++;
    }
});

console.log('Replaced white backgrounds with bg-card in files:', changedFiles);
