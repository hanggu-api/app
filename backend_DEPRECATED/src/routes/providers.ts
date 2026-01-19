import express, { Request, Response } from "express";
import { UserRepository } from "../repositories/userRepository";
import { authMiddleware } from "../middleware/authMiddleware";
import prisma from "../database/prisma";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { appointmentRepository } from "../repositories/appointmentRepository";

// Helpers copied from appointments.ts or shared
function toMin(s: any): number {
  if (!s) return 0;
  if (typeof s === 'string') {
    const parts = s.split(':').map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  }
  if (s instanceof Date) {
    return s.getUTCHours() * 60 + s.getUTCMinutes();
  }
  return 0;
}

function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.getUTCDay();
}

const router = express.Router();
const userRepository = new UserRepository();

async function ensureSeedProviders(lat: number, lng: number, minCount = 5) {
  const count = await prisma.users.count({ where: { role: 'provider' } });
  if (count < minCount) {
    console.log(`[Seed] Creating ${minCount - count} seed providers...`);

    // Find Barbeiro profession ID
    const barberProf = await prisma.professions.findFirst({ where: { name: 'Barbeiro' } });
    const barberId = barberProf?.id || 4196;

    for (let i = 0; i < minCount - count; i++) {
      const id = Math.floor(Math.random() * 1000000);
      const user = await prisma.users.create({
        data: {
          full_name: `Barbearia do ${['João', 'Marcos', 'Pedro', 'Ricardo', 'Lucas'][i % 5]} ${id}`,
          email: `provider${id}@test.com`,
          phone: `119${Math.floor(Math.random() * 90000000 + 10000000)}`,
          role: 'provider',
          password_hash: 'fake_hash_for_seed'
        }
      });

      // Create provider details
      await prisma.providers.create({
        data: {
          user_id: user.id,
          commercial_name: `Barbearia Premium ${id}`,
          rating_avg: new Prisma.Decimal(4.5 + Math.random() * 0.5),
          rating_count: 10 + Math.floor(Math.random() * 50),
          is_online: true
        }
      });

      // Link to Barbeiro profession
      await prisma.provider_professions.create({
        data: {
          provider_user_id: user.id,
          profession_id: barberId
        }
      });

      // Add location near the request (within 5km)
      const offsetLat = (Math.random() - 0.5) * 0.1;
      const offsetLng = (Math.random() - 0.5) * 0.1;
      await prisma.provider_locations.create({
        data: {
          provider_id: user.id,
          latitude: new Prisma.Decimal(lat + offsetLat),
          longitude: new Prisma.Decimal(lng + offsetLng)
        }
      });
    }
  }
}

router.get("/search", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { lat, lon, lng, term, profession_id } = req.query;
    if (!lat || (!lon && !lng)) return res.status(400).json({ success: false, message: "Lat/Lng required" });

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat((lon || lng) as string);

    // await ensureSeedProviders(latitude, longitude);

    let profId: number | undefined = profession_id ? parseInt(profession_id as string) : undefined;

    // If no profession_id but we have a term, look it up
    if (!profId && term) {
      const profession = await prisma.professions.findFirst({
        where: { name: { contains: term as string, mode: 'insensitive' } }
      });
      if (profession) profId = profession.id;
    }

    let providers = await prisma.users.findMany({
      where: {
        role: 'provider',
        providers: { isNot: null },
        ...(profId && {
          provider_professions: {
            some: { profession_id: profId }
          }
        })
      },
      include: {
        providers: true,
        provider_locations: true,
        provider_schedules: true,
        provider_professions: {
          include: {
            professions: {
              include: { service_categories: true }
            }
          }
        }
      } as any
    });

    // FALLBACK: If no providers found with that specific profession, show ALL nearby providers
    if (providers.length === 0) {
      providers = await prisma.users.findMany({
        where: {
          role: 'provider',
          providers: { isNot: null }
        },
        include: {
          providers: true,
          provider_locations: true,
          provider_schedules: true,
          provider_professions: {
            include: {
              professions: {
                include: { service_categories: true }
              }
            }
          }
        } as any,
        take: 10
      });
    }

    // --- ENHANCE WITH REAL-TIME AVAILABILITY ---
    const nowBr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const dateStr = format(nowBr, 'yyyy-MM-dd');
    const dayOfWeek = getDayOfWeek(dateStr);
    const nowMinutesTotal = nowBr.getHours() * 60 + nowBr.getMinutes();

    const enhancedProviders = await Promise.all(providers.map(async (u: any) => {
      // Basic info
      const pData: any = { ...u };
      pData.id = u.id.toString();
      pData.is_open = false;
      pData.next_slot = null;

      // Check schedule for today
      const schedule = u.provider_schedules.find((s: any) => s.day_of_week === dayOfWeek && s.is_enabled);
      if (schedule) {
        const startMin = toMin(schedule.start_time);
        const endMin = toMin(schedule.end_time);

        if (nowMinutesTotal >= startMin && nowMinutesTotal < endMin) {
          pData.is_open = true;
        }

        // Fetch free slots for today to find "next_slot"
        try {
          // Re-using logic from appointments.ts but simplified for the list
          const rangeStart = new Date(`${dateStr}T00:00:00-03:00`);
          const rangeEnd = new Date(rangeStart);
          rangeEnd.setDate(rangeEnd.getDate() + 1);

          const appointments = await appointmentRepository.getAppointments(Number(u.id), rangeStart, rangeEnd);

          let curMin = Math.max(startMin, nowMinutesTotal);
          const duration = schedule.slot_duration || 30;

          while (curMin < endMin) {
            const nextMin = curMin + duration;
            const sTime = new Date(`${dateStr}T${Math.floor(curMin / 60).toString().padStart(2, '0')}:${(curMin % 60).toString().padStart(2, '0')}:00-03:00`);
            const eTime = new Date(`${dateStr}T${Math.floor(nextMin / 60).toString().padStart(2, '0')}:${(nextMin % 60).toString().padStart(2, '0')}:00-03:00`);

            const hasConflict = appointments.some(ap => {
              const apStart = new Date(ap.start_time);
              const apEnd = new Date(ap.end_time);
              return (sTime < apEnd && eTime > apStart);
            });

            if (!hasConflict) {
              pData.next_slot = sTime.toISOString();
              break;
            }
            curMin += duration;
          }
        } catch (e) {
          console.error(`Error calculating next_slot for provider ${u.id}:`, e);
        }
      }

      // Calculate distance if location available
      pData.distance_km = null;
      if (u.provider_locations && latitude && longitude) {
        const pLat = Number(u.provider_locations.latitude);
        const pLon = Number(u.provider_locations.longitude);

        // Haversine formula (approximate)
        const R = 6371; // km
        const dLat = (pLat - latitude) * Math.PI / 180;
        const dLon = (pLon - longitude) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(pLat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        pData.distance_km = R * c;
      }

      // Serialize BigInts in this specific object
      return JSON.parse(JSON.stringify(pData, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        return value;
      }));
    }));

    res.json({ success: true, providers: enhancedProviders });
  } catch (error) {
    console.error("Error in /search:", error);
    res.status(500).json({ success: false, message: "Error searching providers" });
  }
});

router.get("/nearby", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { lat, lng, lon, category_id, profession_id } = req.query;
    const finalLat = lat || req.query.latitude;
    const finalLng = lng || lon || req.query.longitude;

    if (!finalLat || !finalLng) return res.status(400).json({ success: false, message: "Lat/Lng required" });

    const latitude = parseFloat(finalLat as string);
    const longitude = parseFloat(finalLng as string);

    await ensureSeedProviders(latitude, longitude);

    const professionIdNum = profession_id ? parseInt(profession_id as string) : undefined;

    let providers = await prisma.users.findMany({
      where: {
        role: 'provider',
        providers: { isNot: null },
        ...(professionIdNum && {
          provider_professions: {
            some: { profession_id: professionIdNum }
          }
        })
      },
      include: {
        providers: true,
        provider_locations: true,
        provider_professions: {
          include: {
            professions: {
              include: { service_categories: true }
            }
          }
        }
      } as any
    });

    // FALLBACK: If no providers found with that specific profession, show ALL nearby providers
    if (providers.length === 0) {
      providers = await prisma.users.findMany({
        where: {
          role: 'provider',
          providers: { isNot: null }
        },
        include: {
          providers: true,
          provider_locations: true,
          provider_professions: {
            include: {
              professions: {
                include: { service_categories: true }
              }
            }
          }
        } as any,
        take: 10
      });
    }

    res.json({ success: true, providers });

  } catch (error) {
    console.error("Error in /nearby:", error);
    res.status(500).json({ success: false, message: "Error fetching nearby providers" });
  }
});


router.get("/:id/profile", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = BigInt(req.params.id);
    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        providers: true,
        provider_schedules: true,
        provider_custom_services: {
          where: { active: true }
        },
        reviews_reviews_reviewee_idTousers: {
          take: 10,
          orderBy: { created_at: 'desc' },
          include: {
            users_reviews_reviewer_idTousers: {
              select: {
                full_name: true,
                avatar_url: true
              }
            }
          }
        }
      }
    });

    if (!user || user.role !== 'provider' || !user.providers) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const profile = {
      id: user.id.toString(),
      user_id: user.id.toString(),
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      commercial_name: user.providers.commercial_name,
      bio: user.providers.bio,
      rating_avg: user.providers.rating_avg,
      rating_count: user.providers.rating_count,
      address: user.providers.address,
      latitude: user.providers.latitude,
      longitude: user.providers.longitude,
      schedules: user.provider_schedules.map(s => ({
        ...s,
        id: s.id,
        provider_id: s.provider_id.toString()
      })),
      services: user.provider_custom_services.map(s => ({
        ...s,
        id: s.id,
        provider_id: s.provider_id.toString(),
        price: s.price.toString()
      })),
      reviews: user.reviews_reviews_reviewee_idTousers.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        reviewer_name: r.users_reviews_reviewer_idTousers.full_name,
        reviewer_avatar: r.users_reviews_reviewer_idTousers.avatar_url
      }))
    };

    // Serialize BigInts in the structure if missed
    const jsonProfile = JSON.parse(JSON.stringify(profile, (key, value) => {
      if (typeof value === 'bigint') return value.toString();
      return value;
    }));

    res.json({ success: true, profile: jsonProfile });
  } catch (error) {
    console.error("Error fetching provider profile:", error);
    res.status(500).json({ success: false, message: "Error fetching profile" });
  }
});


router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const provider = await prisma.users.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        provider_professions: {
          include: {
            professions: {
              include: { service_categories: true }
            }
          }
        },
        reviews_reviews_reviewee_idTousers: { take: 5, orderBy: { created_at: 'desc' } }
      }
    });
    if (!provider) return res.status(404).json({ success: false, message: "Provider not found" });
    res.json({ success: true, provider });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching provider" });
  }
});

export default router;
