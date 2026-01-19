import prisma from "../database/prisma";
import { chat_messages_type } from "@prisma/client";
import { DataSyncService } from "../services/dataSyncService";

export interface ChatMessage {
  id?: number | bigint;
  service_id: string;
  sender_id: number | bigint;
  content: string;
  type?: chat_messages_type;
  sent_at?: Date;
  read_at?: Date | null;
}

export class ChatRepository {
  async sendMessage(msg: ChatMessage): Promise<number | bigint> {
    const result = await prisma.chat_messages.create({
      data: {
        service_id: msg.service_id,
        sender_id: BigInt(msg.sender_id),
        content: msg.content,
        type: msg.type || "text",
      },
    });

    // Sincroniza com Firestore para entrega em tempo real
    await DataSyncService.syncChatMessageToFirestore(msg.service_id, result.id);

    return result.id;
  }

  async getMessages(serviceId: string): Promise<ChatMessage[]> {
    const rows = await prisma.chat_messages.findMany({
      where: { service_id: serviceId },
      orderBy: { sent_at: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      service_id: r.service_id,
      sender_id: r.sender_id,
      content: r.content ?? "", // Convert null to empty string
      type: r.type as chat_messages_type,
      sent_at: r.sent_at || undefined,
      read_at: r.read_at,
    }));
  }

  async markAsRead(serviceId: string, userId: number): Promise<void> {
    await prisma.chat_messages.updateMany({
      where: {
        service_id: serviceId,
        sender_id: { not: BigInt(userId) },
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });
  }
}

export const chatRepository = new ChatRepository();
