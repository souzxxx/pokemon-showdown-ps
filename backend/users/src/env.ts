import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  AUTH0_DOMAIN: z.string().min(1, 'AUTH0_DOMAIN is required'),
  AUTH0_AUDIENCE: z.string().min(1, 'AUTH0_AUDIENCE is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(8001),
});

export const env = envSchema.parse(process.env);
