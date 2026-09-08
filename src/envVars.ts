import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { z } from "zod";
import { logger } from "~/utils/logger";

// dotenv is loaded when used because esbuild is super optimizing imports...
dotenv.config();

/**
 * Font sizes are numbers (svg px). The old `.env.example` used `"16px"`
 * strings, so a trailing `px` is still stripped for backwards compatibility.
 */
const fontSizeSchema = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.trim().replace(/px\s*$/, "")) : v),
  z.coerce.number().int().positive(),
);

const baseEnvSchema = z.object({
  /** preferred name; falls back to the deprecated TS3_USER_CID below */
  TS3_MAIN_USER_UID: z.string().optional(),
  /** @deprecated renamed to TS3_MAIN_USER_UID */
  TS3_USER_CID: z.string().optional(),
  STREAMDECK_FONT: z.string().optional(),
  STREAMDECK_USER_FONTSIZE: fontSizeSchema.optional(),
  STREAMDECK_AFK_FONTSIZE: fontSizeSchema.optional(),
});

const tsApiTs3 = z
  .object({
    BACKEND_TYPE: z.literal("ts3"),
    TS3_HOST: z.string(),
    TS3_PASSWORD: z.string(),
    TS3_NICKNAME: z.string().optional(),
    TS3_USERNAME: z.string(),
    TS3_QUERYPORT: z.coerce.number().int().positive().optional(),
    TS3_SERVERPORT: z.coerce.number().int().positive().optional(),
  })
  .and(baseEnvSchema);
export type TsApiTs3 = z.infer<typeof tsApiTs3>;

const tsApiCustom = z
  .object({
    BACKEND_TYPE: z.literal("customApi"),
    BACKEND_URL: z
      .string()
      .url()
      .transform((s) => s.replace(/\/+$/, "")),
    BACKEND_WS_URL: z.string().url(),
    BACKEND_TOKEN: z.string(),
  })
  .and(baseEnvSchema);

export type TsApiCustom = z.infer<typeof tsApiCustom>;

const rawEnvSchema = tsApiTs3.or(tsApiCustom).catch((e) => {
  logger.info("❌ invalid env vars:");
  logger.warn(e.error.message);
  throw e;
});

const raw = rawEnvSchema.parse(process.env);

const common = {
  // the deprecated TS3_USER_CID alias is resolved here so the rest of the
  // app only knows the new name
  TS3_MAIN_USER_UID: raw.TS3_MAIN_USER_UID ?? raw.TS3_USER_CID,
  STREAMDECK_FONT: raw.STREAMDECK_FONT ?? "sans-serif",
  STREAMDECK_USER_FONTSIZE: raw.STREAMDECK_USER_FONTSIZE ?? 18,
  STREAMDECK_AFK_FONTSIZE: raw.STREAMDECK_AFK_FONTSIZE ?? 14,
} as const;

/**
 * Cleaned config with final types (numbers, ports with defaults). Still a
 * discriminated union on BACKEND_TYPE so `getTsBackend` narrows as before.
 */
export const envVars =
  raw.BACKEND_TYPE === "ts3"
    ? {
        BACKEND_TYPE: "ts3" as const,
        TS3_HOST: raw.TS3_HOST,
        TS3_PASSWORD: raw.TS3_PASSWORD,
        TS3_NICKNAME: raw.TS3_NICKNAME,
        TS3_USERNAME: raw.TS3_USERNAME,
        TS3_QUERYPORT: raw.TS3_QUERYPORT ?? 10011,
        TS3_SERVERPORT: raw.TS3_SERVERPORT ?? 9987,
        ...common,
      }
    : {
        BACKEND_TYPE: "customApi" as const,
        BACKEND_URL: raw.BACKEND_URL,
        BACKEND_WS_URL: raw.BACKEND_WS_URL,
        BACKEND_TOKEN: raw.BACKEND_TOKEN,
        ...common,
      };
export type EnvVars = typeof envVars;

if (raw.TS3_USER_CID && !raw.TS3_MAIN_USER_UID) {
  logger.warn("TS3_USER_CID is deprecated, rename it to TS3_MAIN_USER_UID");
}
logger.info(`✅ loaded env vars BACKEND_TYPE: ${envVars.BACKEND_TYPE}`);
