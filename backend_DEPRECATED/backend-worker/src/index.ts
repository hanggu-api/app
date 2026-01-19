import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  AI_BASE_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Helper to handle BigInt serialization
const replacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}

app.get('/', (c) => {
  return c.text('Olá Cloudflare! Backend Node.js rodando no Edge com D1 e Prisma.')
})

app.get('/api/status', (c) => {
  return c.json({
    status: 'ok',
    environment: 'Cloudflare Workers',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/users', async (c) => {
  const adapter = new PrismaD1(c.env.DB)
  const prisma = new PrismaClient({ adapter })

  try {
    const users = await prisma.users.findMany({
      take: 10
    })
    return c.json(JSON.parse(JSON.stringify(users, replacer)))
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/appointments', async (c) => {
  const adapter = new PrismaD1(c.env.DB)
  const prisma = new PrismaClient({ adapter })

  try {
    const appointments = await prisma.appointments.findMany({
      take: 20,
      orderBy: { created_at: 'desc' }
    })
    return c.json(JSON.parse(JSON.stringify(appointments, replacer)))
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})

app.get('/api/ai/status', async (c) => {
  try {
    const res = await fetch(c.env.AI_BASE_URL)
    const text = await res.text()
    return c.json({ status: 'ok', upstream: text })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/users', async (c) => {
  const adapter = new PrismaD1(c.env.DB)
  const prisma = new PrismaClient({ adapter })

  try {
    const body = await c.req.json()
    const newUser = await prisma.users.create({
      data: {
        email: body.email,
        password_hash: body.password || 'default_hash',
        full_name: body.name || 'New User',
        role: 'client',
        created_at: new Date(),
        status: 'active'
      }
    })
    return c.json(JSON.parse(JSON.stringify(newUser, replacer)))
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})

app.post('/api/services/:id/confirm_schedule', async (c) => {
  const adapter = new PrismaD1(c.env.DB)
  const prisma = new PrismaClient({ adapter })
  const serviceId = c.req.param('id')

  try {
    const body = await c.req.json()
    const scheduledAt = body.scheduled_at // Expect ISO string

    if (!scheduledAt) {
      return c.json({ error: 'scheduled_at is required' }, 400)
    }

    // 1. Update Service Request
    const updatedService = await prisma.service_requests.update({
      where: { id: serviceId },
      data: {
        status: 'scheduled',
        scheduled_at: new Date(scheduledAt),
        updated_at: new Date()
      }
    })

    // 2. Create System Message in Chat
    // Use BigInt(0) or handle sender_id type strictly based on schema
    await prisma.chat_messages.create({
      data: {
        service_id: serviceId,
        sender_id: BigInt(0),
        content: `📅 Agendamento confirmado para ${new Date(scheduledAt).toLocaleString('pt-BR')}`,
        type: 'system',
        sent_at: new Date()
      }
    })

    return c.json(JSON.parse(JSON.stringify(updatedService, replacer)))
  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})

import { DepartureMonitor } from './services/departureMonitor'

export default {
  fetch: app.fetch,

  // Cron Trigger Handler
  async scheduled(event: any, env: any, ctx: any) {
    console.log('[Worker] Scheduled event triggered:', event.cron)
    const monitor = new DepartureMonitor(env)
    ctx.waitUntil(monitor.checkDepartures())
  }
}
