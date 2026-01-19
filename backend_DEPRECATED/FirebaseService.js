"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const firebase_1 = __importDefault(require("../config/firebase"));
const getFirestore = () => {
    try {
        return firebase_1.default.firestore();
    }
    catch (e) {
        return null;
    }
};
const getRTDB = () => {
    try {
        return firebase_1.default.database();
    }
    catch (e) {
        return null;
    }
};
exports.FirebaseService = {
    /**
     * Updates service document in Firestore.
     */
    updateServiceStatus: async (serviceId, data) => {
        if (!serviceId)
            return;
        try {
            const db = getFirestore();
            if (!db)
                return;
            await db.collection('services').doc(String(serviceId)).set(data, { merge: true });
        }
        catch (e) {
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
    sendChatMessage: async (serviceId, message) => {
        if (!serviceId)
            return;
        try {
            const db = getFirestore();
            if (!db)
                return;
            await db.collection('services').doc(String(serviceId)).collection('messages').add({
                ...message,
                created_at: firebase_1.default.firestore.FieldValue.serverTimestamp(),
                sent_at: new Date().toISOString()
            });
        }
        catch (e) {
            if (!e.message?.includes('Cloud Firestore API has not been used')) {
                console.error(`Error sending chat message to service ${serviceId}:`, e);
            }
        }
    },
    /**
     * Updates provider location in Realtime Database.
     */
    updateProviderLocation: async (providerId, lat, lng) => {
        if (!providerId)
            return;
        try {
            const db = getRTDB();
            if (!db)
                return;
            await db.ref(`locations/${providerId}`).set({
                latitude: lat,
                longitude: lng,
                timestamp: firebase_1.default.database.ServerValue.TIMESTAMP
            });
        }
        catch (e) {
            // Ignore RTDB errors if not enabled
        }
    },
    /**
     * Verifies a Firebase ID Token.
     */
    verifyIdToken: async (token) => {
        try {
            // Simulation/Testing Bypass
            if (token.startsWith("MOCK_TOKEN_") && process.env.NODE_ENV !== "production") {
                const email = token.replace("MOCK_TOKEN_", "");
                return {
                    uid: `mock_${email}`,
                    email: email,
                    name: "Mock User",
                    firebase: { sign_in_provider: "password" }
                };
            }
            return await firebase_1.default.auth().verifyIdToken(token);
        }
        catch (e) {
            console.error('Error verifying Firebase ID token:', e);
            return null;
        }
    },
    /**
     * Gets a value from Firebase Remote Config
     */
    getConfig: async (key, defaultValue) => {
        try {
            const template = await firebase_1.default.remoteConfig().getTemplate();
            const parameter = template.parameters[key];
            if (parameter && parameter.defaultValue) {
                const val = parameter.defaultValue.value;
                if (typeof defaultValue === 'boolean')
                    return val === 'true';
                if (typeof defaultValue === 'number')
                    return Number(val);
                return val;
            }
            return defaultValue;
        }
        catch (e) {
            return defaultValue;
        }
    }
};
