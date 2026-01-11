
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:4011";
const TEST_USER_ID = 528; // User ID from logs

console.log(`🔌 Conectando ao socket em ${SOCKET_URL}...`);

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ Conectado ao servidor!");

  const userId = 528;
  console.log(`📤 Enviando auth: { userId: ${userId} }`);
  socket.emit("auth", { userId });

  // Aguardar um pouco para garantir que entrou na sala
  setTimeout(() => {
    // Coordenadas de São Paulo (mesmas do serviço)
    const lat = -23.550520;
    const lng = -46.633309;
    
    console.log(`📍 Enviando update_location: ${lat}, ${lng} (São Paulo)`);
    socket.emit("update_location", { lat, lng });
    
    // Aguardar resposta/processamento
    setTimeout(() => {
      console.log("👋 Encerrando teste.");
      socket.disconnect();
      process.exit(0);
    }, 2000);
  }, 1000);
});

socket.on("connect_error", (err) => {
  console.error("❌ Erro de conexão:", err.message);
  process.exit(1);
});
