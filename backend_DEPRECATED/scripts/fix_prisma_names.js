const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Primitive parser to find models and rename maps
const lines = schema.split('\n');
let currentModel = null;
let newLines = [];

for (let line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s+\{/);
    if (modelMatch) {
        currentModel = modelMatch[1];
    }

    // Check for closing brace to reset, though not strictly needed as map lives inside
    if (line.includes('}') && !line.includes('{')) {
        // keeping currentModel until next model start is safer or just use it
    }

    if (currentModel && line.includes('map:')) {
        // Replace map: "name" with map: "model_name"
        // Handle both @@index/@@unique and @relation maps
        line = line.replace(/map:\s*"([^"]+)"/g, (match, name) => {
            // If name already contains model name (case insensitive), maybe skip? 
            // But purely unique is safer. Let's prefix.
            // Check if it already starts with model name to avoid double prefixing from multiple runs
            if (name.toLowerCase().startsWith(currentModel.toLowerCase() + '_')) {
                return `map: "${name}"`;
            }
            return `map: "${currentModel}_${name}"`;
        });
    }

    newLines.push(line);
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Updated schema maps.');
