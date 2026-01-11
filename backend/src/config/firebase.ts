import dotenv from "dotenv";
import * as admin from "firebase-admin";
import fs from "fs";
import path from "path";

dotenv.config();

// Tenta carregar as credenciais de diferentes fontes
// 1. Variável de ambiente FIREBASE_SERVICE_ACCOUNT (conteúdo JSON stringificado)
// 2. Arquivo serviceAccountKey.json na raiz
// 3. Inicialização padrão (Google Cloud Environment)

let initialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "cardapyia-service-2025.appspot.com";
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://cardapyia-service-2025-default-rtdb.firebaseio.com",
      storageBucket: storageBucket
    });
    initialized = true;
  } else {
    const candidates = [
      path.join(process.cwd(), "serviceAccountKey.json"),
      path.resolve(__dirname, "../../../serviceAccountKey.json"),
      path.resolve(__dirname, "../../serviceAccountKey.json"),
      path.resolve(__dirname, "../serviceAccountKey.json"),
      path.resolve(process.cwd(), "dist/serviceAccountKey.json"),
    ];
    let foundPath: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(foundPath, "utf-8"));
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "cardapyia-service-2025.appspot.com";
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://cardapyia-service-2025-default-rtdb.firebaseio.com",
        storageBucket: storageBucket
      });
      initialized = true;
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("Arquivo serviceAccountKey.json não encontrado nos caminhos esperados. Tentando inicialização padrão...");
      }
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "cardapyia-service-2025.appspot.com";
      admin.initializeApp({
        databaseURL: "https://cardapyia-service-2025-default-rtdb.firebaseio.com",
        storageBucket: storageBucket
      }); // Tenta usar Application Default Credentials
      initialized = true;
    }
  }
  console.log("Firebase Admin inicializado com sucesso.");
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin:", error);
}

export const firebaseAuth = admin.auth();
export default admin;
