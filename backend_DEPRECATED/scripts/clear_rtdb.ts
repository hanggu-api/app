
import admin from '../src/config/firebase';

async function clearRealtimeDatabase() {
  try {
    console.log('🔥 Clearing all data from Firebase Realtime Database...');
    const db = admin.database();
    const ref = db.ref('/'); // Root reference

    await ref.set(null); // Setting null deletes the data

    console.log('✅ Successfully cleared all data from Realtime Database.');
  } catch (error) {
    console.error('❌ Error clearing Realtime Database:', error);
  } finally {
    process.exit();
  }
}

clearRealtimeDatabase();
