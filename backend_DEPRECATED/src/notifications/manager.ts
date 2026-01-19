import * as admin from "firebase-admin";
import "../config/firebase";
import prisma from "../database/prisma";
import { io } from "../platform";

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
    );

    io.to(`user:${userId}`).emit("notification", {
      type,
      id,
      title,
      body,
      data,
      image: imageUrl,
      created_at: new Date().toISOString(),
    });

    try {
      const devices = await prisma.user_devices.findMany({
        where: { user_id: BigInt(userId) }
      });

      if (devices.length > 0) {
        const tokens = [...new Set(devices.map(d => d.token))];
        const message: admin.messaging.MulticastMessage = {
          tokens,
          notification: { title, body, imageUrl },
          data: {
            type,
            id: String(id),
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            ...Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)]))
          },
          android: {
            priority: "high",
            notification: {
              sound: "iphone_notificacao",
              channelId: "high_importance_channel",
              icon: "ic_stat_logo"
            }
          },
          apns: { payload: { aps: { sound: "default", contentAvailable: true } } }
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) failedTokens.push(tokens[idx]);
          });
          if (failedTokens.length > 0) {
            await prisma.user_devices.deleteMany({ where: { token: { in: failedTokens } } });
          }
        }
      }
    } catch (e) {
      console.error("[Notification] Push error", e);
    }
  },
};
