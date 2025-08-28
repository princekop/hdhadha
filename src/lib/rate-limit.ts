// Upstash Redis-backed rate limiter with in-memory fallback.
// For multi-instance production, UPSTASH is recommended. Fallback is only for local/dev.

import type { Ratelimit as UpstashRateLimitType } from '@upstash/ratelimit'
import type { Redis as UpstashRedisType } from '@upstash/redis'

type Key = string

// In-memory token bucket fallback
class MemoryLimiter {
  private capacity: number
  private refillPerSec: number
  private buckets: Map<Key, { tokens: number; updatedAt: number }>
  constructor({ capacity, refillPerMinute }: { capacity: number; refillPerMinute: number }) {
    this.capacity = capacity
    this.refillPerSec = refillPerMinute / 60
    this.buckets = new Map()
  }
  async take(key: Key, n = 1): Promise<boolean> {
    const now = Date.now()
    const b = this.buckets.get(key) || { tokens: this.capacity, updatedAt: now }
    const elapsedSec = (now - b.updatedAt) / 1000
    b.tokens = Math.min(this.capacity, b.tokens + elapsedSec * this.refillPerSec)
    b.updatedAt = now
    if (b.tokens >= n) {
      b.tokens -= n
      this.buckets.set(key, b)
      return true
    }
    this.buckets.set(key, b)
    return false
  }
}

function makeUpstashLimiter({ limit, window }: { limit: number; window: string }) {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) return null
    // dynamic import to avoid hard dependency if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { Redis } = require('@upstash/redis') as { Redis: new (args: { url: string; token: string }) => UpstashRedisType }
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { Ratelimit } = require('@upstash/ratelimit') as { Ratelimit: new (args: { redis: UpstashRedisType; limiter: { window: string; limit: number } }) => UpstashRateLimitType & { limit: (key: string) => Promise<{ success: boolean }> } }
    const redis = new Redis({ url, token })
    const rl = new Ratelimit({ redis, limiter: { window, limit } })
    return {
      async take(key: string) {
        const res = await rl.limit(key)
        return res.success
      }
    }
  } catch {
    return null
  }
}

// Exported limiters with Upstash if available, else memory fallback
const upstashGenerate = makeUpstashLimiter({ limit: 60, window: '1 m' }) // 60/min
const upstashMessages = makeUpstashLimiter({ limit: 300, window: '1 m' }) // 300/min

export const rlGenerate = upstashGenerate ?? new MemoryLimiter({ capacity: 30, refillPerMinute: 60 })
export const rlMessages = upstashMessages ?? new MemoryLimiter({ capacity: 60, refillPerMinute: 300 })

export function keyFromRequest(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
  const ua = req.headers.get('user-agent') || ''
  return `${ip || 'unknown'}:${hash(ua)}`
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h >>> 0
}
