const { exec } = require("child_process");
const path = require("path");

console.log(
  "[Launcher] Iniciando servidor (Build ignorado para deploy manual)...",
);
startServer();

// // 1. Executa o build do TypeScript
// // 'npm run build' executa 'tsc'
// /*
// const build = exec('npm run build', { cwd: __dirname });
//
// build.stdout.on('data', (data) => console.log(`[Build]: ${data.trim()}`));
// build.stderr.on('data', (data) => console.error(`[Build Error]: ${data.trim()}`));
//
// build.on('close', (code) => {
//   if (code !== 0) {
//     console.error(`[Launcher] Build falhou com código ${code}`);
//     // Se falhar o build, tenta rodar a versão antiga se existir
//     const distServer = path.join(__dirname, 'dist', 'server.js');
//     const fs = require('fs');
//     if (fs.existsSync(distServer)) {
//         console.log('[Launcher] ⚠️ Build falhou, mas tentando iniciar versão anterior...');
//         startServer();
//     } else {
//         process.exit(1);
//     }
//     return;
//   }
//
//   console.log('[Launcher] Build concluído com sucesso. Iniciando servidor...');
//   startServer();
// });
// */

function startServer() {
  // 2. Importa e inicia o servidor compilado
  // O sinal 'process.send("ready")' deve estar dentro do seu server.ts/js
  try {
    require("./dist/server.js");
  } catch (e) {
    console.error("[Launcher] Erro ao iniciar servidor:", e);
    process.exit(1);
  }
}
