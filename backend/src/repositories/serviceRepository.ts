import { v4 as uuidv4 } from "uuid";
import pool from "../database/db";
import { getNearbyProviders } from "../services/locationService";
import {
  COMMISSION_PERCENT,
  commissionNet,
  MIN_TRAVEL_COST,
  TRAVEL_COST_FIXED,
  TRAVEL_COST_PER_KM,
} from "../utils/config";
import logger from "../utils/logger";

export interface ServiceRequest {
  id?: string;
  client_id: number;
  category_id: number;
  profession?: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  price_estimated: number;
  price_upfront: number;
  status?:
  | "waiting_payment"
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";
  provider_id?: number | null;
  created_at?: Date;
  images?: string[];
  video?: string;
  audios?: string[];
  scheduled_at?: Date;
  location_type?: 'client' | 'provider';
}

export class ServiceRepository {
  private haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  // Creates a new service request
  async create(data: ServiceRequest): Promise<string> {
    const id = uuidv4();
    await pool.query(
      `INSERT INTO service_requests 
      (id, client_id, category_id, profession, description, latitude, longitude, address, price_estimated, price_upfront, status, scheduled_at, location_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.client_id,
        data.category_id,
        data.profession || null,
        data.description,
        data.latitude,
        data.longitude,
        data.address,
        data.price_estimated,
        data.price_upfront,
        data.status || 'waiting_payment',
        data.scheduled_at ? new Date(data.scheduled_at) : null,
        data.location_type || 'client',
      ],
    );

    // Insert Media
    if (data.images && data.images.length > 0) {
      for (const key of data.images) {
        await pool.query(
          `INSERT INTO service_media (service_id, media_key, media_type) VALUES (?, ?, 'image')`,
          [id, key],
        );
      }
    }
    if (data.video) {
      await pool.query(
        `INSERT INTO service_media (service_id, media_key, media_type) VALUES (?, ?, 'video')`,
        [id, data.video],
      );
    }
    if (data.audios && data.audios.length > 0) {
      for (const key of data.audios) {
        await pool.query(
          `INSERT INTO service_media (service_id, media_key, media_type) VALUES (?, ?, 'audio')`,
          [id, key],
        );
      }
    }

    return id;
  }

  async updateArrived(id: string): Promise<boolean> {
    const [result]: any = await pool.query(
      "UPDATE service_requests SET arrived_at = NOW() WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }

  async updatePaymentRemaining(id: string): Promise<boolean> {
    const [result]: any = await pool.query(
      "UPDATE service_requests SET payment_remaining_status = 'paid' WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }

  async updateContest(id: string, reason: string): Promise<boolean> {
    const [result]: any = await pool.query(
      "UPDATE service_requests SET contest_status = 'pending', contest_reason = ? WHERE id = ?",
      [reason, id],
    );
    return result.affectedRows > 0;
  }

  async addContestEvidence(id: string, evidence: { type: string, key: string }): Promise<boolean> {
    const [result]: any = await pool.query(
      `UPDATE service_requests 
       SET contest_evidence = JSON_ARRAY_APPEND(
         IFNULL(contest_evidence, JSON_ARRAY()), 
         '$', 
         CAST(? AS JSON)
       )
       WHERE id = ?`,
      [JSON.stringify(evidence), id]
    );
    return result.affectedRows > 0;
  }

  async addTasks(serviceId: string, tasks: any[]): Promise<void> {
    if (!tasks || tasks.length === 0) return;
    const values: any[] = [];
    const placeholders = tasks
      .map(() => "(?, ?, ?, ?, ?)")
      .join(", ");

    for (const t of tasks) {
      values.push(serviceId, t.name, t.quantity, t.unit_price, t.subtotal);
    }

    await pool.query(
      `INSERT INTO service_tasks (service_id, name, quantity, unit_price, subtotal) VALUES ${placeholders}`,
      values,
    );
  }

  // Find matching providers sorted by distance
  async findProvidersByDistance(
    latitude: number,
    longitude: number,
    categoryId: number,
    professionId?: number,
  ): Promise<number[]> {
    // 1. Try MySQL GeoSpatial Search (Haversine)
    const radiusKm = 50; // Search radius
    const nearbyIds = await getNearbyProviders(
      latitude,
      longitude,
      radiusKm,
    );

    if (nearbyIds.length > 0) {
      // Filter by Profession/Category in MySQL
      // We use the IDs from geo search to filter the SQL query
      let query = `
                SELECT DISTINCT pp.provider_user_id
                FROM provider_professions pp
                JOIN professions p ON pp.profession_id = p.id
                WHERE pp.provider_user_id IN (?)
            `;
      const params: any[] = [nearbyIds];

      if (professionId && professionId > 0) {
        query += ` AND pp.profession_id = ?`;
        params.push(professionId);
      } else {
        query += ` AND p.category_id = ?`;
        params.push(categoryId);
      }

      const [rows]: any = await pool.query(query, params);
      const validIds = (Array.isArray(rows) ? rows : []).map((r: any) =>
        String(r.provider_user_id),
      );

      // Return validIds sorted by the order they appeared in nearbyIds (which is distance sorted)
      // Intersection of Geo Results (Distance) AND MySQL Results (Skills)
      const result = nearbyIds
        .filter((id: string) => validIds.includes(id))
        .map((id: string) => Number(id));

      logger.info(
        `[Repo] Found ${result.length} matching candidates via MySQL Geo (out of ${nearbyIds.length} nearby)`,
      );
      return result;
    }

    // 2. Fallback to SQL (Old Logic) if Geo search is empty (e.g. no one tracked yet)
    let query = `
            SELECT DISTINCT pp.provider_user_id, prov.latitude, prov.longitude
            FROM provider_professions pp
            JOIN professions p ON pp.profession_id = p.id
            JOIN providers prov ON pp.provider_user_id = prov.user_id
            WHERE 1=1
        `;
    const params: any[] = [];

    if (professionId && professionId > 0) {
      query += ` AND pp.profession_id = ?`;
      params.push(professionId);
    } else {
      query += ` AND p.category_id = ?`;
      params.push(categoryId);
    }

    // Only providers with location (offline providers are included as they receive Push Notifications)
    query += ` AND prov.latitude IS NOT NULL AND prov.longitude IS NOT NULL`;

    const [rows]: any = await pool.query(query, params);
    const arr = Array.isArray(rows) ? rows : [];

    // Calculate distances and sort
    const withDist = arr.map((r: any) => ({
      id: r.provider_user_id,
      dist: this.haversineKm(
        latitude,
        longitude,
        Number(r.latitude),
        Number(r.longitude),
      ),
    }));

    withDist.sort((a: any, b: any) => a.dist - b.dist);

    return withDist.map((r: any) => r.id);
  }

  // Find all requests for a specific client
  async findByClient(clientId: number): Promise<any[]> {
    const [rows]: any = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon_slug, p.full_name as provider_name 
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       LEFT JOIN users p ON s.provider_id = p.id
       WHERE s.client_id = ?
       ORDER BY s.created_at DESC`,
      [clientId],
    );
    const arr: any[] = Array.isArray(rows) ? rows : [];
    return arr.map((r: any) => ({
      ...r,
      provider_amount: commissionNet(Number(r.price_estimated)),
    }));
  }

  // Find all requests accepted by a specific provider
  async findByProvider(providerId: number): Promise<any[]> {
    const [rows]: any = await pool.query(
      `SELECT s.*, c.name as category_name, c.icon_slug, 
              u.full_name as client_name, u.phone as client_phone, u.avatar_url as client_avatar
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users u ON s.client_id = u.id
       WHERE s.provider_id = ?
       ORDER BY s.created_at DESC`,
      [providerId],
    );
    const arr: any[] = Array.isArray(rows) ? rows : [];
    return arr.map((r: any) => ({
      ...r,
      provider_amount: commissionNet(Number(r.price_estimated)),
    }));
  }

  // Find nearby pending requests for providers
  // (Simplified "nearby" for now: returns all pending)
  async findPendingForProvider(): Promise<any[]> {
    const [rows]: any = await pool.query(
      `SELECT s.*, c.name as category_name, u.full_name as client_name, u.avatar_url as client_avatar
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users u ON s.client_id = u.id
       WHERE s.status = 'pending'
       ORDER BY s.created_at DESC`,
    );
    const arr: any[] = Array.isArray(rows) ? rows : [];
    return arr.map((r: any) => ({
      ...r,
      provider_amount: commissionNet(Number(r.price_estimated)),
    }));
  }

  // Find specific service details
  async findById(id: string): Promise<any | null> {
    const [rows]: any = await pool.query(
      `SELECT s.*, c.name as category_name, 
              (SELECT GROUP_CONCAT(media_key) FROM service_media WHERE service_id = s.id AND media_type = 'image') as images,
              (SELECT media_key FROM service_media WHERE service_id = s.id AND media_type = 'video' LIMIT 1) as video,
              (SELECT GROUP_CONCAT(media_key) FROM service_media WHERE service_id = s.id AND media_type = 'audio') as audios, 
              client.full_name as client_name, client.phone as client_phone, client.email as client_email,
              provider.full_name as provider_name
       FROM service_requests s
       JOIN service_categories c ON s.category_id = c.id
       JOIN users client ON s.client_id = client.id
       LEFT JOIN users provider ON s.provider_id = provider.id
       WHERE s.id = ?`,
      [id],
    );
    const arr: any[] = Array.isArray(rows) ? rows : [];
    if (arr.length === 0) return null;
    const r: any = arr[0];
    r.provider_amount = commissionNet(Number(r.price_estimated));

    // Parse Group Concat
    if (r.images) r.images = r.images.split(",");
    if (r.audios) r.audios = r.audios.split(",");

    const [taskRows]: any = await pool.query(
      `SELECT name, quantity, unit_price, subtotal FROM service_tasks WHERE service_id = ? ORDER BY id ASC`,
      [id],
    );
    r.tasks = Array.isArray(taskRows)
      ? taskRows.map((t: any) => ({
        name: t.name,
        quantity: Number(t.quantity),
        unit_price: Number(t.unit_price),
        subtotal: Number(t.subtotal),
      }))
      : [];

    return r;
  }

  async findPendingForProviderWithDistance(providerId: number): Promise<any[]> {
    // 1. Get Provider Location from provider_locations (Realtime Table)
    let [provRows]: any = await pool.query(
      `SELECT latitude, longitude FROM provider_locations WHERE provider_id = ?`,
      [providerId],
    );

    // Fallback: If not in realtime table, try static providers table
    if (!provRows || provRows.length === 0) {
      [provRows] = await pool.query(
        `SELECT latitude, longitude FROM providers WHERE user_id = ?`,
        [providerId],
      );
    }

    const pArr: any[] = Array.isArray(provRows) ? provRows : [];
    const plat = Number(pArr[0]?.latitude || 0);
    const plon = Number(pArr[0]?.longitude || 0);

    // Get Provider Categories and Professions
    const [profData]: any = await pool.query(
      `SELECT DISTINCT p.category_id, p.name 
             FROM provider_professions pp 
             JOIN professions p ON pp.profession_id = p.id 
             WHERE pp.provider_user_id = ?`,
      [providerId],
    );
    const profArr: any[] = Array.isArray(profData) ? profData : [];
    const categoryIds = [...new Set(profArr.map((c) => c.category_id).filter((id) => id))];
    const professionNames = profArr.map((p) => p.name);

    if (categoryIds.length === 0) {
      logger.warn(`[Repo] Provider ${providerId} has no categories mapped.`);
      return [];
    }

    logger.info(`[Repo] Finding services for provider ${providerId} in categories: ${categoryIds.join(",")}`);

    try {
      const [rows]: any = await pool.query(
        `SELECT s.*, c.name as category_name, u.full_name as client_name, u.avatar_url as client_avatar
         FROM service_requests s
         JOIN service_categories c ON s.category_id = c.id
         JOIN users u ON s.client_id = u.id
         WHERE s.status = 'pending'
         AND s.category_id IN (${categoryIds.join(",")})
         AND s.id NOT IN (SELECT service_id FROM service_rejections WHERE provider_id = ?)
         ORDER BY s.created_at DESC`,
        [providerId],
      );
      const arr: any[] = Array.isArray(rows) ? rows : [];

      // Filter by Profession Name (Strict Match)
      const filteredArr = arr.filter((r: any) => {
        if (r.profession && !professionNames.includes(r.profession)) {
          return false;
        }
        return true;
      });

      const mapped = filteredArr.map((r: any) => {
        try {
          const distanceKm =
            plat && plon && r.latitude && r.longitude
              ? this.haversineKm(
                Number(plat),
                Number(plon),
                Number(r.latitude),
                Number(r.longitude),
              )
              : 0;
          const travel_cost =
            TRAVEL_COST_FIXED > 0
              ? TRAVEL_COST_FIXED
              : Math.max(
                Math.round(distanceKm * TRAVEL_COST_PER_KM * 100) / 100,
                MIN_TRAVEL_COST,
              );
          const price = Number(r.price_estimated || 0);
          const total_estimated = price + travel_cost;
          return {
            ...r,
            travel_distance_km: distanceKm,
            travel_cost,
            total_estimated,
            provider_amount: isFinite(total_estimated) ? commissionNet(total_estimated) : 0,
          };
        } catch (err) {
          logger.error(`Error mapping service request ${r.id}`, err);
          return r;
        }
      });

      // Sort by distance (closest first)
      mapped.sort((a: any, b: any) => a.travel_distance_km - b.travel_distance_km);

      return mapped;
    } catch (e) {
      logger.error("findPendingForProviderWithDistance.query_failed", e);
      throw e;
    }
  }

  // Reject a service for a specific provider
  async reject(serviceId: string, providerId: number): Promise<void> {
    await pool.query(
      `INSERT IGNORE INTO service_rejections (service_id, provider_id) VALUES (?, ?)`,
      [serviceId, providerId],
    );
  }

  // Atomically accept a service (Concurrency Safe)
  async acceptService(serviceId: string, providerId: number): Promise<boolean> {
    const [result]: any = await pool.query(
      `UPDATE service_requests 
       SET status = 'accepted', provider_id = ? 
       WHERE id = ? AND status = 'pending'`,
      [providerId, serviceId],
    );
    return (result && result.affectedRows ? result.affectedRows : 0) > 0;
  }

  // Cancel a service (Client only, if pending)
  async cancelService(serviceId: string, clientId: number): Promise<boolean> {
    const [result]: any = await pool.query(
      `UPDATE service_requests 
             SET status = 'cancelled' 
             WHERE id = ? AND client_id = ? AND status IN ('pending', 'waiting_payment', 'open')`,
      [serviceId, clientId],
    );
    return (result && result.affectedRows ? result.affectedRows : 0) > 0;
  }

  // Update status (e.g. in_progress, completed)
  async updateStatus(serviceId: string, status: string): Promise<boolean> {
    const [result]: any = await pool.query(
      `UPDATE service_requests SET status = ? WHERE id = ?`,
      [status, serviceId],
    );
    return (result && result.affectedRows ? result.affectedRows : 0) > 0;
  }

  async createEditRequest(params: {
    service_id: string;
    provider_id: number;
    reason: string;
    description: string;
    additional_value: number;
    images?: string[];
    video?: string | null;
  }): Promise<number> {
    const platform_fee =
      Math.round(params.additional_value * COMMISSION_PERCENT * 100) / 100;
    const images_json = JSON.stringify(params.images || []);
    const [result]: any = await pool.query(
      `INSERT INTO service_edit_requests (service_id, provider_id, reason, description, additional_value, platform_fee, images_json, video_key, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        params.service_id,
        params.provider_id,
        params.reason,
        params.description,
        params.additional_value,
        platform_fee,
        images_json,
        params.video || null,
      ],
    );
    return result.insertId as number;
  }

  async getEditRequest(
    serviceId: string,
    requestId: number,
  ): Promise<any | null> {
    const [rows]: any = await pool.query(
      `SELECT * FROM service_edit_requests WHERE id = ? AND service_id = ?`,
      [requestId, serviceId],
    );
    const arr: any[] = Array.isArray(rows) ? rows : [];
    if (arr.length === 0) return null;
    return arr[0];
  }

  async listEditRequests(serviceId: string): Promise<any[]> {
    const [rows]: any = await pool.query(
      `SELECT * FROM service_edit_requests WHERE service_id = ? ORDER BY created_at DESC`,
      [serviceId],
    );
    const arr: any[] = Array.isArray(rows) ? rows : [];
    return arr;
  }

  async acceptEditRequest(
    serviceId: string,
    requestId: number,
  ): Promise<boolean> {
    const req = await this.getEditRequest(serviceId, requestId);
    if (!req || req.status !== "pending") return false;
    const [updReq]: any = await pool.query(
      `UPDATE service_edit_requests SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE id = ? AND service_id = ? AND status = 'pending'`,
      [requestId, serviceId],
    );
    if (!(updReq && updReq.affectedRows ? updReq.affectedRows : 0))
      return false;
    const delta = Number(req.additional_value) + Number(req.platform_fee);
    const [updService]: any = await pool.query(
      `UPDATE service_requests SET price_estimated = price_estimated + ? WHERE id = ?`,
      [delta, serviceId],
    );
    return (
      (updService && updService.affectedRows ? updService.affectedRows : 0) > 0
    );
  }

  async declineEditRequest(
    serviceId: string,
    requestId: number,
  ): Promise<boolean> {
    const [result]: any = await pool.query(
      `UPDATE service_edit_requests SET status = 'declined', decided_at = CURRENT_TIMESTAMP WHERE id = ? AND service_id = ? AND status = 'pending'`,
      [requestId, serviceId],
    );
    return (result && result.affectedRows ? result.affectedRows : 0) > 0;
  }

  async applyTravelCost(serviceId: string, providerId: number): Promise<void> {
    const [[prov]]: any = await pool.query(
      `SELECT latitude, longitude FROM providers WHERE user_id = ?`,
      [providerId],
    );
    const [[svc]]: any = await pool.query(
      `SELECT latitude, longitude FROM service_requests WHERE id = ?`,
      [serviceId],
    );
    const plat = Number(prov?.latitude || 0);
    const plon = Number(prov?.longitude || 0);
    const slat = Number(svc?.latitude || 0);
    const slon = Number(svc?.longitude || 0);
    if (
      !isFinite(plat) ||
      !isFinite(plon) ||
      !isFinite(slat) ||
      !isFinite(slon)
    )
      return;
    const km = this.haversineKm(plat, plon, slat, slon);
    const cost =
      TRAVEL_COST_FIXED > 0
        ? TRAVEL_COST_FIXED
        : Math.max(
          Math.round(km * TRAVEL_COST_PER_KM * 100) / 100,
          MIN_TRAVEL_COST,
        );
    await pool.query(
      `INSERT INTO service_tasks (service_id, name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)`,
      [
        serviceId,
        "Deslocamento",
        TRAVEL_COST_FIXED > 0 ? 1 : km,
        TRAVEL_COST_FIXED > 0 ? TRAVEL_COST_FIXED : TRAVEL_COST_PER_KM,
        cost,
      ],
    );
    await pool.query(
      `UPDATE service_requests SET price_estimated = price_estimated + ? WHERE id = ?`,
      [cost, serviceId],
    );
  }
}
