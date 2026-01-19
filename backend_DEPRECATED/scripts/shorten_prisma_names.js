const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const lines = schema.split('\n');
let newLines = [];

for (let line of lines) {
    let newLine = line;

    if (line.includes('map:')) {
        newLine = line.replace(/map:\s*"([^"]+)"/, (match, name) => {
            if (name.length > 60) {
                // Create a short hash of the long name to ensure uniqueness
                const hash = crypto.createHash('sha1').update(name).digest('hex').substring(0, 8);
                // Try to keep the start of the name for readability (first 20 chars)
                const prefix = name.substring(0, 30);
                // Ensure we don't end with partial words if possible, but hard to guarantee.
                // New name: prefix + '_' + hash
                // Note: we should preserve the suffix if it was _idx, _key, _fkey to distinguish types
                let suffix = '';
                if (name.endsWith('_idx')) suffix = '_idx';
                else if (name.endsWith('_key')) suffix = '_key';
                else if (name.endsWith('_fkey')) suffix = '_fkey';

                // Remove suffix from prefix to avoid duplication
                const cleanPrefix = prefix.replace(/(_idx|_key|_fkey)$/, '');

                const newName = `${cleanPrefix}_${hash}${suffix}`;
                // Ensure it's under 63 (Safe margin 60)
                if (newName.length > 60) {
                    // Fallback: just hash + suffix
                    return `map: "mapped_${hash}${suffix}"`;
                }
                return `map: "${newName}"`;
            }
            return match;
        });
    }

    newLines.push(newLine);
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Shortened map names.');
