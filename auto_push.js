const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

// Configuração
const DEBOUNCE_MS = 5000; // Espera 5 segundos após a última alteração antes de enviar
const IGNORED_PATHS = [
    '.git', 
    'node_modules', 
    'build', 
    '.dart_tool', 
    '.pub-cache', 
    'Pods', 
    'temp_web_deploy',
    'dist'
];

let timeout = null;
let isPushing = false;
let changes = new Set();

function shouldIgnore(filename) {
    if (!filename) return true;
    return IGNORED_PATHS.some(ignored => filename.includes(ignored));
}

function gitPush() {
    if (isPushing) {
        // Se já estiver enviando, agenda nova tentativa
        timeout = setTimeout(gitPush, DEBOUNCE_MS);
        return;
    }
    
    if (changes.size === 0) return;

    isPushing = true;
    console.log(`\n[${new Date().toLocaleTimeString()}] Iniciando sincronização do Git...`);
    console.log(`Arquivos alterados recentemente: ${Array.from(changes).join(', ')}`);
    
    const time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const commitMsg = `Auto-save: ${time}`;
    
    // Comando Git completo
    const cmd = `git add . && git commit -m "${commitMsg}" && git push`;
    
    exec(cmd, (error, stdout, stderr) => {
        isPushing = false;
        changes.clear(); // Limpa a lista de alterações processadas
        
        if (error) {
            // Ignora erro se não houver nada para commitar
            if (stdout.includes('nothing to commit') || stderr.includes('nothing to commit') || 
                stdout.includes('nothing to add') || stderr.includes('nothing to add')) {
                console.log('Nada para enviar.');
            } else {
                console.error(`Erro ao sincronizar: ${error.message}`);
                console.error(stderr);
            }
        } else {
            console.log('✅ Sincronização concluída com sucesso!');
            // console.log(stdout); // Descomente para ver detalhes
        }
    });
}

console.log('🚀 Monitor de Auto-Push iniciado!');
console.log(`Monitorando diretório atual: ${process.cwd()}`);
console.log('Qualquer arquivo salvo será enviado para o GitHub automaticamente após 5 segundos.');
console.log('Pressione Ctrl+C para parar.');

try {
    fs.watch('.', { recursive: true }, (eventType, filename) => {
        if (shouldIgnore(filename)) return;

        console.log(`📝 Alteração detectada: ${filename}`);
        changes.add(filename);

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(gitPush, DEBOUNCE_MS);
    });
} catch (e) {
    console.error('Erro ao iniciar o monitor:', e.message);
    console.log('Nota: Em alguns sistemas, o monitoramento recursivo pode ter limitações.');
}
