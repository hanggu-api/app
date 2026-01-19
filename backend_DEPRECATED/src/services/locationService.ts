import prisma from "../database/prisma";
import logger from "../utils/logger";
import { io } from "../platform";

export const updateProviderLocation = async (
  providerId: number | string,
  lat: number,
  lng: number,
) => {
  try {
    const id = BigInt(providerId);

    // Update Postgres (Persistent) using Prisma Upsert
    await prisma.provider_locations.upsert({
      where: { provider_id: id },
      update: {
        latitude: lat,
        longitude: lng,
        updated_at: new Date()
      },
      create: {
        provider_id: id,
        latitude: lat,
        longitude: lng,
        updated_at: new Date()
      }
    });

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
    // Haversine formula for Postgres using $queryRaw
    // We use cast to double precision for safety
    const rows: any[] = await prisma.$queryRaw`
      SELECT provider_id, 
             (6371 * acos(cos(radians(${lat})) * cos(radians(CAST(latitude AS DOUBLE PRECISION))) * cos(radians(CAST(longitude AS DOUBLE PRECISION)) - radians(${lng})) + sin(radians(${lat})) * sin(radians(CAST(latitude AS DOUBLE PRECISION))))) AS distance 
      FROM provider_locations 
      WHERE (6371 * acos(cos(radians(${lat})) * cos(radians(CAST(latitude AS DOUBLE PRECISION))) * cos(radians(CAST(longitude AS DOUBLE PRECISION)) - radians(${lng})) + sin(radians(${lat})) * sin(radians(CAST(latitude AS DOUBLE PRECISION))))) < ${radiusKm}
      ORDER BY distance ASC;
    `;

    return rows.map((row: any) => String(row.provider_id));
  } catch (error) {
    logger.error(
      "[LocationService] Failed to search nearby providers in Postgres",
      error,
    );
    return [];
  }
};
