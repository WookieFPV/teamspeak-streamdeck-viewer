/**
 * Each Second has 1000  ms
 */
const MsPerS = 1000;

/**
 * Each Minute has 1000 * 60 ms
 */
const MsPerMin = 1000 * 60;

/**
 * Each hour has 1000 * 60 * 60 ms
 */
const MsPerHour = 1000 * 60 * 60;

export const sToMs = (secs: number): number => secs * MsPerS;
export const minsToMs = (mins: number): number => mins * MsPerMin;
export const hoursToMs = (hours: number): number => hours * MsPerHour;
export const daysToMs = (days: number): number => hoursToMs(days * 24);
