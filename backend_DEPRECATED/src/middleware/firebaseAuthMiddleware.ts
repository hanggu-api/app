import { Request, Response, NextFunction } from "express";
import { firebaseAuth } from "../config/firebase";
import { UserRepository } from "../repositories/userRepository";
import logger from "../utils/logger";

export const firebaseAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    // 1. Verificar token no Firebase
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    req.firebaseUser = decodedToken;

    // 2. Sincronizar com banco de dados local
    // Precisamos garantir que este usuário do Firebase existe no nosso MySQL
    // para ter um ID numérico e Role compatível com o resto do sistema
    const userRepo = new UserRepository();

    // Tenta buscar pelo UID do Firebase
    let user = await userRepo.findByFirebaseUid(decodedToken.uid);

    if (!user) {
      // Se não achou pelo UID, tenta pelo email (caso seja migração de usuário antigo)
      if (decodedToken.email) {
        user = await userRepo.findByEmail(decodedToken.email);

        if (user) {
          // Usuário existia no sistema antigo, vamos vincular o UID agora
          await userRepo.updateFirebaseUid(user.id!, decodedToken.uid);
          // Recarrega o usuário atualizado
          user = await userRepo.findByFirebaseUid(decodedToken.uid);
        }
      }
    }

    // Se ainda não existe, precisamos criar (fluxo de primeiro login)
    // OBS: Isso pode ser feito aqui ou numa rota específica de /login/sync
    // Para simplificar, se não existir, retornamos 401 específico pedindo registro/sincronização,
    // ou criamos automaticamente se tiver dados suficientes.
    // Vamos assumir que o frontend chama uma rota de "login/sync" primeiro,
    // mas para rotas protegidas gerais, o usuário TEM que existir no MySQL.

    if (!user) {
      // Caso especial: Se a rota for de criação de usuário/sync, permitimos passar
      // Mas como este é um middleware geral de proteção, devemos bloquear se não tiver conta local.
      // Porém, para facilitar a migração, vamos permitir que o request passe com 'firebaseUser'
      // mas sem 'user' local, e a rota que decide se aceita ou não.
      // OU: Bloqueamos e forçamos o app a chamar /auth/firebase-login primeiro.

      // Decisão: Retornar erro específico para o front saber que precisa registrar
      res.status(401).json({
        success: false,
        message: "User not registered in local database",
        code: "USER_NOT_FOUND_LOCAL",
        firebase_uid: decodedToken.uid,
      });
      return;
    }

    // Anexa usuário local ao request
    req.user = {
      id: Number(user.id!),
      firebase_uid: user.firebase_uid || decodedToken.uid,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    };

    next();
  } catch (error) {
    logger.error("firebaseAuthMiddleware", error);
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};
