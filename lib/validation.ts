import { z } from 'zod';

export const entrySchema = z.object({
  purchaserName: z.string().min(2),
  email: z.string().email(),
  teamName: z.string().min(2),
  tiebreakWinnerScore: z.coerce.number().int().min(-50).max(50),
  picks: z.array(
    z.object({
      tierNum: z.number().int().min(1).max(6),
      golferId: z.string().min(1)
    })
  ).length(6)
});

export const adminLoginSchema = z.object({
  password: z.string().min(1)
});

export const csvTierImportSchema = z.object({
  csv: z.string().min(1)
});
