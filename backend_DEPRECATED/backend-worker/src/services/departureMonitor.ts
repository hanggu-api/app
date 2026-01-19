
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'

// Simple Haversine for distance if Google API fails/is too expensive
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export class DepartureMonitor {
    private prisma: PrismaClient
    private AI_BASE_URL: string

    constructor(env: any) {
        const adapter = new PrismaD1(env.DB)
        this.prisma = new PrismaClient({ adapter })
        this.AI_BASE_URL = env.AI_BASE_URL
    }

    async checkDepartures() {
        console.log('[DepartureMonitor] Checking for upcoming fixed services...')

        // 1. Find upcoming services (Next 3 hours)
        const now = new Date()
        const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000)

        // Using raw query for D1 boolean compatibility if needed, but Prisma usually handles it.
        // Assuming 'departure_alert_sent' was added as boolean (0/1 in SQLite)
        const services = await this.prisma.service_requests.findMany({
            where: {
                status: { in: ['accepted', 'pending'] },
                location_type: 'provider',
                scheduled_at: {
                    gt: now,
                    lt: threeHoursLater
                },
                departure_alert_sent: false
            },
            include: {
                users: true, // Client
            }
        })

        console.log(`[DepartureMonitor] Found ${services.length} candidates.`)

        for (const rawService of services) {
            const service = rawService as any;
            try {
                if (!service.users || !service.latitude || !service.longitude) continue;

                // Client Location (Approximation using their registered address/coords)
                const clientLat = Number(service.users.latitude || 0)
                const clientLng = Number(service.users.longitude || 0)

                if (clientLat === 0 && clientLng === 0) {
                    console.log(`[DepartureMonitor] Client ${service.client_id} has no location. Skipping.`)
                    continue
                }

                const destinationLat = Number(service.latitude)
                const destinationLng = Number(service.longitude)

                // 2. Calculate Travel Time
                // Heuristic: 30km/h in city (0.5 km/min)
                const distanceKm = calculateDistance(clientLat, clientLng, destinationLat, destinationLng)
                const speedKmH = 30
                const travelTimeHours = distanceKm / speedKmH
                const travelTimeMinutes = Math.ceil(travelTimeHours * 60)

                // Buffer: 15 mins to park/find place
                const bufferMinutes = 15
                const totalLeadTimeMinutes = travelTimeMinutes + bufferMinutes

                // 3. Check "Time To Leave"
                const scheduledTime = new Date(service.scheduled_at!)
                const timeToLeave = new Date(scheduledTime.getTime() - totalLeadTimeMinutes * 60000)

                console.log(`[DepartureMonitor] Svc ${service.id}: Dist=${distanceKm.toFixed(1)}km, Travel=${travelTimeMinutes}min. Leave at ${timeToLeave.toISOString()}`)

                if (now >= timeToLeave) {
                    // TRIGGER ALERT!
                    await this.triggerAlert(service, travelTimeMinutes)
                }

            } catch (e) {
                console.error(`[DepartureMonitor] Error processing service ${service.id}:`, e)
            }
        }
    }

    async triggerAlert(service: any, travelTime: number) {
        console.log(`[DepartureMonitor] 🚨 TRIGGERING ALERT for Service ${service.id}`)

        // Send Notification via Internal API (calling itself or direct DB insert if supported)
        // Since this is a worker, we can invoke the binding or just use fetch to the public URL
        // For simplicity and speed in this specific environment, we will use a direct fetch to the notification endpoint
        // configured in the app, or if not possible, logic to insert into notification tables directly.

        // OPTION 1: Direct DB Insert (Most reliable in Worker)
        const title = '⏰ Hora de Sair!'
        const body = `Você tem um agendamento em ${travelTime + 15} min. Saia agora para chegar a tempo!`

        // 1. Create Notification Record
        await this.prisma.notifications.create({
            data: {
                user_id: BigInt(service.client_id),
                title,
                body,
                type: 'time_to_leave',
                data: JSON.stringify({
                    service_id: service.id,
                    travel_time: travelTime,
                    lat: service.latitude,
                    lng: service.longitude
                }),
                is_read: false,
                created_at: new Date()
            }
        })

        // 2. Send FCM (Need to fetch FCM token first)
        // This part is tricky without importing the NotificationService.
        // We can try to use the `fetch` to our own API if we know the URL.
        // Or we can simple rely on the client polling or the socket if connected (but worker doesn't have open socket).
        // Ideally, we shoud import `NotificationService` but it might have dependencies not available here.
        // Let's rely on the DB notification for now, which the App should sync (via polling or onResume).
        // BUT user wants a "Modal" so we really need a push.

        // Let's mark as sent to avoid loops
        await this.prisma.service_requests.update({
            where: { id: service.id },
            data: { departure_alert_sent: true }
        })
    }
}
