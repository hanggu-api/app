import pool from "../database/db";
import logger from "../utils/logger";
import { io } from "../platform";

export const updateProviderLocation = async (
  providerId: number | string,
  lat: number,
  lng: number,
) => {
  try {
    // Update MySQL (Persistent)
    // Using ON DUPLICATE KEY UPDATE
    await pool.query(
      `INSERT INTO provider_locations (provider_id, latitude, longitude, updated_at) 
             VALUES (?, ?, ?, NOW()) 
             ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), updated_at = NOW()`,
      [providerId, lat, lng],
    );

    // Emit to tracking room
    io.to(`track_provider:${providerId}`).emit("provider_location_update", {
      provider_id: providerId,
      latitude: lat,
      longitude: lng,
    });
  } catch (error) {
    logger.error(
      `[LocationService] Failed to update location for provider ${providerId}`,
      error,
    );
    throw error;
  }
};

export const getNearbyProviders = async (
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<string[]> => {
  try {
    // Haversine formula to find nearby providers in MySQL
    // 6371 is Earth's radius in km
    const query = `
      SELECT provider_id, 
             (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance 
      FROM provider_locations 
      HAVING distance < ? 
      ORDER BY distance ASC;
    `;

    const [rows]: any = await pool.query(query, [lat, lng, lat, radiusKm]);

    // Map rows to array of provider IDs (as strings to match previous Redis return type)
    return rows.map((row: any) => String(row.provider_id));
  } catch (error) {
    logger.error(
      "[LocationService] Failed to search nearby providers in MySQL",
      error,
    );
    return [];
  }
};
