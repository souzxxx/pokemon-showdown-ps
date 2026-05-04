import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const TTL_SECONDS = 60 * 60 * 24; // 24h — Pokémon data is static

const client = createClient({ url: REDIS_URL });
let connected = false;

client.on('error', (err: Error) => console.error('[Redis] error:', err.message));

export async function connectRedis(): Promise<void> {
  try {
    await client.connect();
    connected = true;
    console.log('[Redis] connected →', REDIS_URL);
  } catch {
    console.warn('[Redis] unavailable — running without cache');
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!connected) return null;
  try {
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  if (!connected) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: TTL_SECONDS });
  } catch {
    // silent — cache miss on next request is acceptable
  }
}
