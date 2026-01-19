import { Router, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase";
import { UserRepository } from "../repositories/userRepository";
import logger from "../utils/logger";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/config";

interface HumanMetrics {
  dwell_time_ms: number;
  pointer_moves: number;
  focus_changes: number;
  avg_keypress_interval_ms: number;
  was_pasted: boolean;
}

/**
 * Avalia se os sinais comportamentais indicam um humano.
 * Retorna true se passar na verificação, false se parecer um bot.
 */
function isHumanInteraction(metrics: HumanMetrics): boolean {
  let score = 0;

  // 1. Tempo de permanência: Bots costumam ser instantâneos
  if (metrics.dwell_time_ms >= 1500) score++;

  // 2. Movimentos: Robôs de script puro não geram eventos de toque/arrasto
  if (metrics.pointer_moves >= 2) score++;

  // 3. Troca de foco: Humanos saltam entre campos (email -> senha)
  if (metrics.focus_changes >= 1) score++;

  // 4. Cadência de digitação: Bots "colam" texto ou digitam em 0ms
  if (
    metrics.avg_keypress_interval_ms >= 60 &&
    metrics.avg_keypress_interval_ms <= 1500
  ) {
    if (!metrics.was_pasted) score++;
  }

  // Regra de decisão: Se tiver pelo menos 2 sinais claros, consideramos humano.
  // Podes ajustar este limite conforme fores testando.
  return score >= 2;
}

const router = Router();
const userRepo = new UserRepository();

// Rota para login/registro via Firebase
// O frontend envia o ID Token do Firebase no corpo ou header
router.post("/login", async (req: Request, res: Response) => {
  try {
    const idToken = req.body.token || req.headers.authorization?.split(" ")[1];
    const {
      role,
      phone,
      human_metrics,
      commercial_name,
      name: bodyName,
    } = req.body; // Campos opcionais para registro de novos usuários

    if (!idToken) {
      res
        .status(400)
        .json({ success: false, message: "Token Firebase não fornecido" });
      return;
    }

    // Validação de segurança comportamental
    if (human_metrics) {
      const metrics: HumanMetrics = {
        dwell_time_ms: Number(human_metrics.dwell_time_ms || 0),
        pointer_moves: Number(human_metrics.pointer_moves || 0),
        focus_changes: Number(human_metrics.focus_changes || 0),
        avg_keypress_interval_ms: Number(
          human_metrics.avg_keypress_interval_ms || 0,
        ),
        was_pasted: Boolean(human_metrics.was_pasted),
      };

      if (!isHumanInteraction(metrics)) {
        console.warn(`[Security] Bloqueio de bot detectado.`);
        res.status(429).json({
          success: false,
          error: "Too Many Requests",
          message:
            "Verificação de interação humana falhou. Por favor, tente novamente de forma manual.",
        });
        return;
      }
    }

    // 1. Verificar Token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    console.log(
      "DEBUG: Dados do Firebase (decodedToken):",
      JSON.stringify(decodedToken, null, 2),
    );

    const { uid, email, name: tokenName, picture } = decodedToken;
    // Prioriza o nome enviado no corpo da requisição (input do usuário), fallback para o token
    const name = bodyName || tokenName;

    if (!email) {
      res
        .status(400)
        .json({
          success: false,
          message: "Email é obrigatório no provider do Firebase",
        });
      return;
    }

    // 2. Verificar se usuário existe no DB local
    let user = await userRepo.findByFirebaseUid(uid);
    let isNewUser = false;

    if (!user) {
      // Tenta achar por email (migração)
      user = await userRepo.findByEmail(email);

      if (user) {
        // Usuário existe (legado), vamos vincular o UID
        await userRepo.updateFirebaseUid(user.id!, uid);
        // Se tiver avatar novo do google e o atual for nulo, poderiamos atualizar, mas vamos manter simples
      } else {
        // Usuário NOVO. Vamos criar.
        isNewUser = true;
        const newRole =
          role === "client" || role === "provider" ? role : "client"; // Default client

        const newUserId = await userRepo.create({
          email,
          full_name: name || "Usuário Firebase",
          role: newRole,
          password_hash: "firebase_oauth", // Placeholder, não usado para login
          phone: phone || null,
          firebase_uid: uid,
        });

        // Se for provider, cria registro extra
        if (newRole === "provider") {
          await userRepo.createProvider(newUserId);
          if (commercial_name) {
            await userRepo.updateProviderExtra(newUserId, { commercial_name });
          }
        }

        // Busca o usuário criado
        user = await userRepo.findById(newUserId);
      }
    }

    if (!user) {
      res
        .status(500)
        .json({ success: false, message: "Falha ao recuperar usuário" });
      return;
    }

    // Sincronizar dados do Firebase (Nome e Foto)
    if (name && user.full_name !== name) {
      await userRepo.updateName(user.id!, name);
      user.full_name = name;
    }
    if (picture && user.avatar_url !== picture) {
      await userRepo.updateAvatar(user.id!, picture);
      user.avatar_url = picture;
    }

    // 3. Gerar Token JWT de Sessão (Opcional, mas mantém compatibilidade com frontend existente que espera 'token')
    const appToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, firebase_uid: uid },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    let displayName = user.full_name;
    let commercialName = undefined;
    if (user.role === "provider") {
      const providerDetails = await userRepo.getProviderDetails(user.id!);
      if (providerDetails?.commercial_name) {
        displayName = providerDetails.commercial_name;
        commercialName = providerDetails.commercial_name;
      }
    }

    res.json({
      success: true,
      message: isNewUser
        ? "Usuário criado com sucesso"
        : "Login realizado com sucesso",
      user: {
        id: user.id,
        name: displayName,
        full_name: user.full_name,
        commercial_name: commercialName,
        email: user.email,
        role: user.role,
        firebase_uid: uid,
        avatar_url: picture,
      },
      token: appToken, // Token legado para compatibilidade
      firebase_token: idToken, // Echo do token firebase se útil
    });
  } catch (error: unknown) {
    logger.error("auth.firebase.login", error);
    res
      .status(401)
      .json({
        success: false,
        message: "Token Firebase inválido ou expirado",
        error: String(error),
      });
  }
});

export default router;
