
import fs from 'fs';
import path from 'path';

const csvPath = 'c:/Users/thela/.gemini/antigravity/scratch/projeto_figma_app/mobile_app/app.csv';

const content = fs.readFileSync(csvPath, 'utf8');
console.log('Content start:', content.substring(0, 500));
const lines = content.split('\n'); // Standard unix or mixed

console.log('Total lines (split by \\n):', lines.length);

const headers = [
    { name: 'users', pattern: '"id","firebase_uid"' },
    { name: 'professions', pattern: '"id","name","category_id","icon","keywords"' },
    { name: 'task_catalog', pattern: '"id","profession_id","name","pricing_type"' },
    { name: 'categories', pattern: '"id","name","icon","slug"' },
    { name: 'payments', pattern: '"id","mission_id","proposal_id"' },
];

headers.forEach(h => {
    const idx = lines.findIndex(l => l.includes(h.pattern));
    console.log(`Table [${h.name}] found at line: ${idx}`);
    if (idx !== -1) {
        console.log(`  Sample row: ${lines[idx + 1]?.substring(0, 100)}`);
    }
});
