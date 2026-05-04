import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  BATTLE_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  USERS_SERVICE_URL: z.string().url().default('http://localhost:8001'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
