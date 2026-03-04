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

    // Remove the opacity modifier from text-charcoal and text-charcoal-muted
    // so they become solid and much darker/visible on white backgrounds
    content = content.replace(/text-charcoal-muted\/[0-9]+/g, 'text-charcoal-muted');
    content = content.replace(/text-charcoal\/[0-9]+/g, 'text-charcoal');

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedFiles++;
    }
});

console.log('Fixed opacity in files:', changedFiles);
