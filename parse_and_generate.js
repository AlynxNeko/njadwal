const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('NJADWAL_v2_MASTER.md', 'utf8');

// Match sections like "## 📄 filepath" followed by a codeblock
const regex = /## 📄 ([^\n]+)\n+```[a-z]*\n([\s\S]*?)```/g;
let match;
let count = 0;

while ((match = regex.exec(content)) !== null) {
    let filepath = match[1].trim();
    // Remove explanations like " — Creates Xendit Invoice"
    filepath = filepath.split('—')[0].trim();
    filepath = filepath.split('-')[0].trim();

    const fileContent = match[2];

    const fullPath = path.join(__dirname, filepath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, fileContent, 'utf8');
    console.log(`Created: ${filepath}`);
    count++;
}

console.log(`Total files created: ${count}`);
