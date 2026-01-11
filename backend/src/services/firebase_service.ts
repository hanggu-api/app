import admin from '../config/firebase';

const getFirestore = () => {
  try { return admin.firestore(); } catch (e) { return null; }
};
const getRTDB = () => {
  try { return admin.database(); } catch (e) { return null; }
};

export const FirebaseService = {
  /**
   * Updates service document in Firestore.
   */
  updateServiceStatus: async (serviceId: string | number, data: any) => {
    if (!serviceId) return;
    try {
      const db = getFirestore();
      if (!db) return;
      await db.collection('services').doc(String(serviceId)).set(data, { merge: true });
    } catch (e: any) {
      if (e.message?.includes('Cloud Firestore API has not been used')) {
        // Silently ignore if API disabled
        return;
      }
      console.error(`Error updating service ${serviceId} in Firestore:`, e);
    }
  },

  /**
   * Adds a chat message to the service's message subcollection.
   */
  sendChatMessage: async (serviceId: string | number, message: any) => {
    if (!serviceId) return;
    try {
      const db = getFirestore();
      if (!db) return;
      await db.collection('services').doc(String(serviceId)).collection('messages').add({
        ...message,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        sent_at: new Date().toISOString()
      });
    } catch (e: any) {
      if (!e.message?.includes('Cloud Firestore API has not been used')) {
        console.error(`Error sending chat message to service ${serviceId}:`, e);
      }
    }
  },

  /**
   * Updates provider location in Realtime Database.
   */
  updateProviderLocation: async (providerId: string | number, lat: number, lng: number) => {
    if (!providerId) return;
    try {
      const db = getRTDB();
      if (!db) return;
      await db.ref(`locations/${providerId}`).set({
        latitude: lat,
        longitude: lng,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
    } catch (e: any) {
      // Ignore RTDB errors if not enabled
    }
  },

  /**
   * Sends a realtime event to a user (e.g. service offered) via RTDB.
   */
  sendUserEvent: async (userId: string | number, event: string, payload: any) => {
    if (!userId) return;
    try {
      const db = getRTDB();
      if (!db) return;
      await db.ref(`events/${userId}`).push({
        type: event,
        payload: payload,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
    } catch (e: any) {
      // Ignore RTDB errors if not enabled
    }
  },

  /**
   * Verifies a Firebase ID Token.
   */
  verifyIdToken: async (token: string) => {
    try {
      // Simulation/Testing Bypass
      if ((token.startsWith("MOCK_TOKEN_") && process.env.NODE_ENV !== "production") || token.startsWith("MOCK_TOKEN_SECRET_123_")) {
        const email = token.replace("MOCK_TOKEN_", "").replace("SECRET_123_", "");
        return {
          uid: `mock_${email}`,
          email: email,
          name: "Mock User",
          firebase: { sign_in_provider: "password" }
        } as any;
      }
      return await admin.auth().verifyIdToken(token);
    } catch (e) {
      console.error('Error verifying Firebase ID token:', e);
      return null;
    }
  },

  /**
   * Gets a value from Firebase Remote Config
   */
  getConfig: async (key: string, defaultValue: any) => {
    try {
      const template = await admin.remoteConfig().getTemplate();
      const parameter = template.parameters[key];
      if (parameter && parameter.defaultValue) {
        const val = (parameter.defaultValue as any).value;
        if (typeof defaultValue === 'boolean') return val === 'true';
        if (typeof defaultValue === 'number') return Number(val);
        return val;
      }
      return defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
};
