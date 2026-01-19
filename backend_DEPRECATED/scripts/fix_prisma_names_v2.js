const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const lines = schema.split('\n');
let newLines = [];

for (let line of lines) {
    let newLine = line;

    // Indexes: @@index
    if (line.includes('@@index') && line.includes('map:')) {
        newLine = line.replace(/map:\s*"([^"]+)"/, (match, name) => {
            if (!name.endsWith('_idx')) {
                return `map: "${name}_idx"`;
            }
            return match;
        });
    }
    // Unique Constraints: @@unique or @unique
    else if ((line.includes('@@unique') || line.includes('@unique')) && line.includes('map:')) {
        newLine = line.replace(/map:\s*"([^"]+)"/, (match, name) => {
            if (!name.endsWith('_key')) {
                return `map: "${name}_key"`;
            }
            return match;
        });
    }
    // Foreign Keys: @relation
    else if (line.includes('@relation') && line.includes('map:')) {
        newLine = line.replace(/map:\s*"([^"]+)"/, (match, name) => {
            if (!name.endsWith('_fkey')) {
                return `map: "${name}_fkey"`;
            }
            return match;
        });
    }
    // Primary Keys: @@id ? (Usually don't have map, but if they do)
    // Not common in this schema based on previous read.

    newLines.push(newLine);
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Appended suffixes to schema maps.');
