import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  SPORTRADAR_API_KEY: z.string().min(1).default('placeholder'),
  SPORTRADAR_ACCESS_LEVEL: z.string().default('trial'),
  SPORTRADAR_GOLF_TOUR: z.string().default('pga'),
  SPORTRADAR_LANG: z.string().default('en'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('Masters Pool 2026'),
  MASTERS_PARENT_ID: z.string().optional()
});

export const env = envSchema.parse(process.env);
