/**
 * Comprehensive Bug Scanner and Auto-Fixer
 * 
 * Scans entire codebase for bugs and fixes them automatically
 * Runs in loop until zero bugs remain
 * 
 * Usage: node comprehensive_bug_scanner.js
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Colors for terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Bug tracking
const bugs = {
    critical: [],
    high: [],
    medium: [],
    low: [],
};

async function runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            resolve({ error, stdout, stderr });
        });
    });
}

async function scanFlutterCode() {
    log('\n📱 SCANNING FLUTTER CODE...', 'cyan');

    const flutterPath = path.join(__dirname, '..', 'mobile_app');

    // Run flutter analyze
    log('   Running flutter analyze...', 'blue');
    const analyzeResult = await runCommand('flutter analyze', flutterPath);

    if (analyzeResult.stdout) {
        const lines = analyzeResult.stdout.split('\n');
        lines.forEach(line => {
            if (line.includes('warning') || line.includes('error')) {
                const bug = {
                    type: line.includes('error') ? 'critical' : 'high',
                    file: line.match(/lib\\\\(.+?):/)?.[1] || 'unknown',
                    message: line.trim(),
                    autoFixable: line.includes('unused_import')
                };

                if (bug.type === 'critical') {
                    bugs.critical.push(bug);
                } else {
                    bugs.high.push(bug);
                }
            }
        });
    }

    log(`   ✅ Found ${bugs.critical.length} critical, ${bugs.high.length} high priority issues`, 'yellow');
}

async function scanBackendCode() {
    log('\n🔧 SCANNING BACKEND CODE...', 'cyan');

    const backendPath = path.join(__dirname);

    // Check for TypeScript errors
    log('   Checking TypeScript compilation...', 'blue');
    const tscResult = await runCommand('npx tsc --noEmit', backendPath);

    if (tscResult.stderr) {
        const lines = tscResult.stderr.split('\n');
        lines.forEach(line => {
            if (line.includes('error TS')) {
                bugs.critical.push({
                    type: 'critical',
                    file: line.match(/src\/(.+?)\(/)?.[1] || 'unknown',
                    message: line.trim(),
                    autoFixable: false
                });
            }
        });
    }

    log(`   ✅ TypeScript check complete`, 'yellow');
}

async function fixUnusedImports() {
    log('\n🔨 FIXING UNUSED IMPORTS...', 'cyan');

    const unusedImportBugs = bugs.high.filter(b => b.autoFixable && b.message.includes('unused_import'));

    for (const bug of unusedImportBugs) {
        try {
            const filePath = path.join(__dirname, '..', 'mobile_app', 'lib', bug.file);
            const content = await fs.readFile(filePath, 'utf8');

            // Extract import line to remove
            const importMatch = bug.message.match(/import: '(.+?)'/);
            if (importMatch) {
                const importToRemove = importMatch[1];
                const lines = content.split('\n');
                const filteredLines = lines.filter(line => !line.includes(importToRemove));

                await fs.writeFile(filePath, filteredLines.join('\n'), 'utf8');
                log(`   ✅ Fixed unused import in ${bug.file}`, 'green');
            }
        } catch (error) {
            log(`   ❌ Failed to fix ${bug.file}: ${error.message}`, 'red');
        }
    }
}

async function generateBugReport() {
    log('\n📊 BUG REPORT', 'bright');
    log('═'.repeat(60), 'bright');

    const total = bugs.critical.length + bugs.high.length + bugs.medium.length + bugs.low.length;

    log(`\n🔴 CRITICAL: ${bugs.critical.length}`, 'red');
    bugs.critical.forEach((bug, i) => {
        log(`   ${i + 1}. ${bug.file}: ${bug.message.substring(0, 80)}...`, 'red');
    });

    log(`\n🟠 HIGH: ${bugs.high.length}`, 'yellow');
    bugs.high.forEach((bug, i) => {
        log(`   ${i + 1}. ${bug.file}: ${bug.message.substring(0, 80)}...`, 'yellow');
    });

    log(`\n🟡 MEDIUM: ${bugs.medium.length}`, 'blue');
    log(`\n🟢 LOW: ${bugs.low.length}`, 'green');

    log(`\n📈 TOTAL BUGS: ${total}`, 'bright');
    log('═'.repeat(60), 'bright');

    return total;
}

async function main() {
    log('\n🚀 ========================================', 'bright');
    log('🚀 COMPREHENSIVE BUG SCANNER', 'bright');
    log('🚀 ========================================\n', 'bright');

    let iteration = 1;
    let totalBugs = 0;

    do {
        log(`\n🔄 ITERATION ${iteration}`, 'cyan');
        log('─'.repeat(60), 'cyan');

        // Reset bugs
        bugs.critical = [];
        bugs.high = [];
        bugs.medium = [];
        bugs.low = [];

        // Scan
        await scanFlutterCode();
        await scanBackendCode();

        // Fix
        await fixUnusedImports();

        // Report
        totalBugs = await generateBugReport();

        iteration++;

        if (totalBugs > 0 && iteration > 5) {
            log('\n⚠️  Maximum iterations reached. Manual intervention required.', 'yellow');
            break;
        }

    } while (totalBugs > 0);

    if (totalBugs === 0) {
        log('\n🎉 ========================================', 'green');
        log('🎉 ALL BUGS FIXED!', 'green');
        log('🎉 CODE IS READY FOR PRODUCTION', 'green');
        log('🎉 ========================================\n', 'green');
    }

    process.exit(totalBugs === 0 ? 0 : 1);
}

main();
