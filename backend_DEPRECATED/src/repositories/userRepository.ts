import prisma from "../database/prisma";
import { users, providers, professions, provider_locations, users_role } from "@prisma/client";

export interface User {
  id?: number | bigint;
  firebase_uid?: string | null;
  email: string;
  password_hash: string;
  full_name: string;
  role: users_role;
  phone?: string | null;
  avatar_url?: string | null;
}

export class UserRepository {
  async findByFirebaseUid(uid: string): Promise<User | null> {
    const user = await prisma.users.findUnique({
      where: { firebase_uid: uid }
    });
    return user as User | null;
  }

  async updateFirebaseUid(userId: number | bigint, uid: string): Promise<void> {
    await prisma.users.update({
      where: { id: BigInt(userId) },
      data: { firebase_uid: uid }
    });
  }

  async updateName(userId: number | bigint, fullName: string): Promise<void> {
    await prisma.users.update({
      where: { id: BigInt(userId) },
      data: { full_name: fullName }
    });
  }

  async findById(id: number | bigint): Promise<User | null> {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(id) }
    });
    return user as User | null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.users.findUnique({
      where: { email: email }
    });
    return user as User | null;
  }

  async create(user: User): Promise<number> {
    const created = await prisma.users.create({
      data: {
        email: user.email,
        password_hash: user.password_hash,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone || null,
        firebase_uid: user.firebase_uid || null,
      }
    });
    return Number(created.id);
  }

  async createProvider(userId: number | bigint, bio: string = ""): Promise<void> {
    await prisma.providers.create({
      data: {
        user_id: BigInt(userId),
        bio: bio,
        wallet_balance: 0.00
      }
    });
  }

  async updateAvatar(userId: number | bigint, key: string): Promise<void> {
    await prisma.users.update({
      where: { id: BigInt(userId) },
      data: { avatar_url: key }
    });
  }

  async updateAvatarBlob(userId: number | bigint, blob: Buffer): Promise<void> {
    await prisma.users.update({
      where: { id: BigInt(userId) },
      data: { avatar_blob: blob }
    });
  }

  async getAvatarBlob(userId: number | bigint): Promise<Buffer | null> {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      select: { avatar_blob: true }
    });
    return user?.avatar_blob ? Buffer.from(user.avatar_blob) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const user = await prisma.users.findFirst({
      where: { phone: phone }
    });
    return user as User | null;
  }

  async getProviderDetails(
    userId: number | bigint,
  ): Promise<{ commercial_name?: string | null; wallet_balance?: any } | null> {
    const provider = await prisma.providers.findUnique({
      where: { user_id: BigInt(userId) },
      select: { commercial_name: true, wallet_balance: true }
    });
    return provider;
  }

  async findProviderByDocument(
    document: string,
  ): Promise<any | null> {
    const provider = await prisma.providers.findFirst({
      where: { document_value: document }
    });
    return provider;
  }

  async updateProviderExtra(
    userId: number | bigint,
    extras: {
      document_type?: "cpf" | "cnpj";
      document_value?: string;
      commercial_name?: string;
      address?: string;
    },
  ): Promise<void> {
    await prisma.providers.update({
      where: { user_id: BigInt(userId) },
      data: {
        document_type: extras.document_type as any,
        document_value: extras.document_value,
        commercial_name: extras.commercial_name,
        address: extras.address
      }
    });
  }

  async updateProviderLocation(
    userId: number | bigint,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    await prisma.provider_locations.upsert({
      where: { provider_id: BigInt(userId) },
      update: {
        latitude: latitude,
        longitude: longitude,
        updated_at: new Date()
      },
      create: {
        provider_id: BigInt(userId),
        latitude: latitude,
        longitude: longitude,
        updated_at: new Date()
      }
    });
  }

  async delete(id: number | bigint): Promise<void> {
    await prisma.users.delete({
      where: { id: BigInt(id) }
    });
  }

  async findProfessionByName(
    name: string,
  ): Promise<{ id: number; name: string; service_type: string } | null> {
    const prof = await prisma.professions.findUnique({
      where: { name: name }
    });
    return prof as { id: number; name: string; service_type: string } | null;
  }

  async upsertProfession(name: string): Promise<number> {
    const lower = name.toLowerCase();
    let type: any = 'on_site';

    if (lower.match(/médic|medic|doutor|dentista|odont|psic|terapeuta|nutri|fisiot|fono|bio|estet|cli|consult|advogad|agend|barb|cabel|manic|pedic/)) {
      type = 'at_provider';
    }

    const prof = await prisma.professions.upsert({
      where: { name: name },
      update: { service_type: type },
      create: { name: name, service_type: type }
    });
    return prof.id;
  }

  async setProviderProfessions(
    userId: number | bigint,
    professionIds: number[],
  ): Promise<void> {
    await prisma.provider_professions.deleteMany({
      where: { provider_user_id: BigInt(userId) }
    });
    for (const pid of professionIds) {
      await prisma.provider_professions.create({
        data: {
          provider_user_id: BigInt(userId),
          profession_id: pid
        }
      });
    }
  }

  async addProviderProfession(
    userId: number | bigint,
    professionId: number,
  ): Promise<void> {
    try {
      await prisma.provider_professions.create({
        data: {
          provider_user_id: BigInt(userId),
          profession_id: professionId
        }
      });
    } catch (e) {
      // Ignore if already exists
    }
  }

  async getProviderProfessions(
    userId: number | bigint,
  ): Promise<{ name: string; service_type: string }[]> {
    const relations = await prisma.provider_professions.findMany({
      where: { provider_user_id: BigInt(userId) }
    });

    const professionIds = relations.map(r => r.profession_id);
    const profs = await prisma.professions.findMany({
      where: { id: { in: professionIds } },
      orderBy: { name: 'asc' }
    });

    return profs.map((p) => ({
      name: p.name,
      service_type: p.service_type || "on_site",
    }));
  }

  async getProviderFlags(userId: number | bigint): Promise<{ is_medical: boolean; is_fixed_location: boolean }> {
    const profs = await this.getProviderProfessions(userId);
    const isMedical = profs.some(p =>
      p.name.toLowerCase().includes('médic') ||
      p.name.toLowerCase().includes('medic') ||
      p.name.toLowerCase().includes('doutor') ||
      p.name.toLowerCase().includes('clinic') ||
      p.name.toLowerCase().includes('saúd')
    );
    const isFixedLocation = profs.some(p =>
      p.service_type === 'at_provider' ||
      p.name.toLowerCase().includes('barb') ||
      p.name.toLowerCase().includes('cabel')
    );

    return { is_medical: isMedical, is_fixed_location: isFixedLocation };
  }

  async removeProviderProfession(
    userId: number | bigint,
    professionName: string,
  ): Promise<void> {
    const prof = await prisma.professions.findUnique({
      where: { name: professionName }
    });
    if (prof) {
      await prisma.provider_professions.deleteMany({
        where: {
          provider_user_id: BigInt(userId),
          profession_id: prof.id
        }
      });
    }
  }

  async findProvidersByProfession(
    professionId: number,
  ): Promise<{ id: number; full_name: string }[]> {
    const relations = await prisma.provider_professions.findMany({
      where: { profession_id: professionId }
    });

    const userIds = relations.map(r => r.provider_user_id);
    const users = await prisma.users.findMany({
      where: { id: { in: userIds } },
      select: { id: true, full_name: true }
    });

    return users.map(u => ({ id: Number(u.id), full_name: u.full_name }));
  }

  async searchProviders(
    term: string,
    lat?: number,
    lon?: number
  ): Promise<any[]> {
    // For complex search with distance and group by, $queryRaw is better
    let query: any;

    if (lat && lon) {
      query = prisma.$queryRaw`
        SELECT 
          u.id, 
          u.full_name, 
          u.avatar_url, 
          p.commercial_name, 
          p.address,
          p.rating_avg,
          p.rating_count,
          pl.latitude,
          pl.longitude,
          (6371 * acos(
            cos(radians(${lat})) * cos(radians(CAST(pl.latitude AS DOUBLE PRECISION))) * cos(radians(CAST(pl.longitude AS DOUBLE PRECISION)) - radians(${lon})) +
            sin(radians(${lat})) * sin(radians(CAST(pl.latitude AS DOUBLE PRECISION)))
          )) as distance_km
        FROM users u
        JOIN providers p ON u.id = p.user_id
        LEFT JOIN provider_locations pl ON u.id = pl.provider_id
        WHERE u.role = 'provider'
        ${term ? prisma.$queryRaw`AND (u.full_name ILIKE ${'%' + term + '%'} OR p.commercial_name ILIKE ${'%' + term + '%'})` : prisma.$queryRaw``}
        ORDER BY distance_km ASC
      `;
    } else {
      query = prisma.$queryRaw`
        SELECT 
          u.id, 
          u.full_name, 
          u.avatar_url, 
          p.commercial_name, 
          p.address,
          p.rating_avg,
          p.rating_count,
          pl.latitude,
          pl.longitude,
          NULL as distance_km
        FROM users u
        JOIN providers p ON u.id = p.user_id
        LEFT JOIN provider_locations pl ON u.id = pl.provider_id
        WHERE u.role = 'provider'
        ${term ? prisma.$queryRaw`AND (u.full_name ILIKE ${'%' + term + '%'} OR p.commercial_name ILIKE ${'%' + term + '%'})` : prisma.$queryRaw``}
        ORDER BY p.rating_avg DESC
      `;
    }

    const rows: any[] = await query;

    // Process rows to add fallback avatar URL and professions
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:4011';
    for (const p of rows) {
      if (!p.avatar_url || p.avatar_url === '') {
        p.avatar_url = `${baseUrl}/api/media/avatar/${p.id}`;
      }
      // Add professions (simplified for search results)
      const profs = await this.getProviderProfessions(p.id);
      p.professions = profs.map(pr => pr.name).join(', ');
    }

    return rows;
  }

  async getFullProfile(userId: number | bigint): Promise<any> {
    const user = await prisma.users.findUnique({
      where: { id: BigInt(userId) },
      include: {
        providers: true,
      }
    });

    if (!user || !user.providers) return null;

    const profile: any = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      commercial_name: user.providers.commercial_name,
      bio: user.providers.bio,
      address: user.providers.address,
      rating_avg: Number(user.providers.rating_avg || 0),
      rating_count: user.providers.rating_count || 0,
      latitude: Number(user.providers.latitude || 0),
      longitude: Number(user.providers.longitude || 0),
      is_online: user.providers.is_online
    };

    if (!profile.avatar_url || profile.avatar_url === '') {
      profile.avatar_url = `${process.env.API_BASE_URL || 'http://localhost:4011'}/api/media/avatar/${userId}`;
    }

    // Fetch Professions
    profile.professions = await this.getProviderProfessions(userId);

    // Fetch Schedules
    profile.schedules = await prisma.provider_schedules.findMany({
      where: { provider_id: BigInt(userId) }
    });

    // Fetch Services from task_catalog based on provider's professions
    const relations = await prisma.provider_professions.findMany({
      where: { provider_user_id: BigInt(userId) }
    });
    const professionIds = relations.map(r => r.profession_id);

    const catalogServices = await prisma.task_catalog.findMany({
      where: { profession_id: { in: professionIds } },
      orderBy: { name: 'asc' }
    });

    // Fetch Custom Services (if any)
    const customServices = await prisma.provider_custom_services.findMany({
      where: { provider_id: BigInt(userId), active: true }
    });

    profile.services = [
      ...catalogServices.map(s => ({
        id: s.id,
        name: s.name,
        description: '',
        duration: 60,
        price: Number(s.unit_price),
        category: s.profession_id
      })),
      ...customServices.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: Number(s.price),
        category: s.category
      }))
    ];

    // Fetch Recent Reviews (limit to 10)
    const reviews = await prisma.reviews.findMany({
      where: { reviewee_id: BigInt(userId) },
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        users_reviews_reviewer_idTousers: {
          select: { full_name: true, avatar_url: true }
        }
      }
    });

    profile.reviews = reviews.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      reviewer_name: r.users_reviews_reviewer_idTousers.full_name,
      reviewer_avatar: r.users_reviews_reviewer_idTousers.avatar_url
    }));

    return profile;
  }
}
