import { Request, Response } from "express";
import { updateProviderLocation } from "../services/locationService";
import logger from "../utils/logger";
import axios from "axios";

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    // Assuming auth middleware populates req.user
    // const providerId = req.user?.id;
    // For now, accepting provider_id in body for testing/simulation if needed,
    // but typically it comes from the token.
    // Let's support both for flexibility during dev.
    const providerId = (req as any).user?.id || req.body.provider_id;

    if (!providerId || latitude === undefined || longitude === undefined) {
      return res
        .status(400)
        .json({ error: "Missing provider_id, latitude, or longitude" });
    }

    await updateProviderLocation(
      providerId,
      Number(latitude),
      Number(longitude),
    );

    return res.json({ success: true, message: "Location updated" });
  } catch (error) {
    logger.error("Error updating location", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const reverseGeocode = async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    // Using OpenStreetMap Nominatim API (Free, requires User-Agent)
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "CardapyiaService/1.0",
        "Accept-Language": "pt-BR"
      }
    });

    if (response.data && response.data.address) {
      const addr = response.data.address;
      // Format address nicely
      const formatted = [
        addr.road || addr.pedestrian || addr.suburb,
        addr.house_number,
        addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.municipality,
        addr.state
      ].filter(Boolean).join(", ");

      return res.json({
        success: true,
        address: formatted,
        details: response.data.address
      });
    }

    return res.json({ success: false, message: "Address not found" });

  } catch (error) {
    logger.error("Error reverse geocoding", error);
    // Return a generic fallback if external API fails to avoid breaking the app flow
    return res.json({ 
      success: true, 
      address: `Lat: ${req.query.lat}, Lon: ${req.query.lon}`,
      fallback: true 
    });
  }
};
