import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const serviceAccountPath = path.resolve(__dirname, "../../serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
    });
}

const token = "e384Pg0oRAujWzBCwi4vbo:APA91bE7lNSk-2iQXojUO0JUl6BCJkzS7bRLDmqP6kOz3ct4ZuBbyNGRHeWqflvvnsCyr3NAWQiM1Ep3itVfrLu9gzTThf1kvI2KDDzwVR0c4VQuocgzAz8";

async function sendTestNotification() {
    console.log("🚀 Enviando notificação de teste para o token capturado...");

    const message: admin.messaging.Message = {
        token: token,
        notification: {
            title: "Teste com Emulador Bloqueado",
            body: "Esta é uma notificação de teste enviada do backend local!",
        },
        data: {
            type: "test_notification",
            id: "test_123",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
            priority: "high",
            notification: {
                sound: "default",
                channelId: "high_importance_channel",
                icon: "ic_stat_logo",
                priority: "max",
            },
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("✅ Notificação enviada com sucesso:", response);
    } catch (error) {
        console.error("❌ Erro ao enviar notificação:", error);
    }
}

sendTestNotification();
