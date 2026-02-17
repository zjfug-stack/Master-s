import { formatInTimeZone } from 'date-fns-tz';

export const CHICAGO_TZ = 'America/Chicago';

export function formatLock(date: Date): string {
  return formatInTimeZone(date, CHICAGO_TZ, "EEE, MMM d yyyy 'at' h:mm a zzz");
}

export function isLocked(lockAt: Date): boolean {
  return new Date() >= lockAt;
}
