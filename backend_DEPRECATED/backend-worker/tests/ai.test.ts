import { describe, expect, it } from 'vitest'

const BASE_URL = 'https://meu-backend-node.carrobomebarato.workers.dev'

describe('AI Endpoint', () => {
  it('Should reach upstream AI service', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/status`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(typeof data.upstream).toBe('string')
    expect(String(data.upstream).length).toBeGreaterThan(0)
  })
})
