import { io } from "../platform";
import * as admin from "firebase-admin";
import db from "../database/db";
import "../config/firebase"; // Ensure Firebase is initialized via central config

// Firebase Admin is already initialized in config/firebase.ts
// We just verify it here
if (admin.apps.length === 0) {
  console.warn(
    "[Notification] Firebase Admin not initialized even after importing config",
  );
}

export const TEMPLATES = {
  NEW_SERVICE: (name: string) => ({
    title: "Novo Serviço",
    body: `Novo serviço disponível para ${name}`,
  }),
  NEW_MESSAGE: (name: string) => ({
    title: "Nova Mensagem",
    body: `Nova mensagem de ${name}`,
  }),
  SERVICE_COMPLETED: () => ({
    title: "Serviço Concluído",
    body: "O serviço foi marcado como concluído.",
  }),
  SERVICE_ACCEPTED: () => ({
    title: "Serviço Aceito",
    body: "Um prestador aceitou seu serviço!",
  }),
  SERVICE_STARTED: () => ({
    title: "Serviço Iniciado",
    body: "O prestador iniciou o serviço.",
  }),
  SERVICE_CANCELLED: () => ({
    title: "Serviço Cancelado",
    body: "O serviço foi cancelado.",
  }),
  PAYMENT_APPROVED: () => ({
    title: "Pagamento Aprovado",
    body: "Seu pagamento foi confirmado. O serviço será iniciado.",
  }),
  PROVIDER_ARRIVED: () => ({
    title: "Prestador Chegou",
    body: "O prestador chegou ao local.",
  }),
  CLIENT_ARRIVED: () => ({
    title: "Cliente Chegou",
    body: "O cliente chegou ao local.",
  }),
  PAYMENT_REMAINING_PAID: () => ({
    title: "Pagamento Restante Confirmado",
    body: "O pagamento restante foi confirmado.",
  }),
  SERVICE_CONTESTED: () => ({
    title: "Serviço Contestado",
    body: "O cliente contestou a conclusão do serviço. Por favor, envie as evidências.",
  }),
  CONTEST_OPENED: () => ({
    title: "Serviço Contestado",
    body: "O cliente contestou a conclusão do serviço. Por favor, envie as evidências.",
  }),
  EDIT_REQUEST: () => ({
    title: "Solicitação de Adicional",
    body: "O prestador solicitou um ajuste de valor.",
  }),
};

export const notificationManager = {
  sendToProfession: async (
    professionId: number,
    type: string,
    id: string,
    title: string,
    body: string,
    data: any,
  ) => {
    console.log(
      `[Notification] Sending to profession ${professionId}: ${title} - ${body}`,
      data,
    );
    // Em um cenário real, você poderia ter salas por profissão: io.to(`profession:${professionId}`).emit(...)
    // Por enquanto, vamos assumir que o frontend lida com isso via polling ou que enviamos para todos (não ideal)
    // Ou melhor, o controller que chama isso deve identificar os usuários e chamar send() individualmente.
  },
  send: async (
    userId: number,
    type: string,
    id: string,
    title: string,
    body: string,
    data: any,
    imageUrl?: string,
  ) => {
    console.log(
      `[Notification] Sending to user ${userId}: ${title} - ${body}`,
      data,
    );

    // 1. Send via Socket.io (Realtime / Foreground)
    io.to(`user:${userId}`).emit("notification", {
      type,
      id,
      title,
      body,
      data,
      image: imageUrl,
      created_at: new Date().toISOString(),
    });

    // 2. Send via FCM (Background / Terminated)
    try {
      const [rows] = (await db.query(
        "SELECT token FROM user_devices WHERE user_id = ?",
        [userId],
      )) as any;

      if (rows && rows.length > 0) {
        const tokens = rows.map((r: any) => r.token);
        // Remove duplicates
        const uniqueTokens = [...new Set(tokens)] as string[];

        if (uniqueTokens.length === 0) return;

        const notification: admin.messaging.Notification = {
          title,
          body,
        };

        if (imageUrl) {
          notification.imageUrl = imageUrl;
        }

        const message: admin.messaging.MulticastMessage = {
          tokens: uniqueTokens,
          notification,
          data: {
            type,
            id: String(id),
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            image: imageUrl || "",
            ...Object.fromEntries(
              Object.entries(data || {}).map(([k, v]) => [k, String(v)]),
            ),
          },
          android: {
            priority: "high",
            ttl: 0, // Entrega imediata
            notification: {
              sound: "iphone_notificacao", // Usar som customizado se disponível
              priority: "high",
              channelId: "high_importance_channel", // v2 removed
              icon: "ic_stat_logo",
              color: "#FFD700",
              visibility: "public",
              defaultVibrateTimings: true,
            },
          },
          apns: {
            headers: {
              "apns-priority": "10", // Alta prioridade para iOS
            },
            payload: {
              aps: {
                sound: "iphone_notificacao.caf",
                contentAvailable: true,
                mutableContent: true,
              },
            },
            fcmOptions: {
              imageUrl: imageUrl,
            },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        // Cleanup invalid tokens
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(uniqueTokens[idx]);
              console.log(`[Notification] Token ${idx} failed:`, resp.error);
            }
          });
          if (failedTokens.length > 0) {
            // Delete invalid tokens from DB
            await db.query('DELETE FROM user_devices WHERE token IN (?)', [failedTokens]);
            console.log(
              `[Notification] Failed to send to ${failedTokens.length} tokens (deleted invalid tokens)`,
            );
          }
        }
      }
    } catch (e) {
      console.error("[Notification] Error sending push notification:", e);
    }
  },
};
