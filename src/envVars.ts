import { z } from "zod";
import { logger } from "~/utils/logger";
// .env is loaded automatically by the bun runtime

const baseEnvSchema = z.object({
  TS3_USER_CID: z.string().optional(),
  DEBUG_UI: z.string().optional(),
  STREAMDECK_FONT: z.string().optional(),
  STREAMDECK_USER_FONTSIZE: z.string().optional(),
  STREAMDECK_AFK_FONTSIZE: z.string().optional(),
});

const tsApiTs3 = z
  .object({
    BACKEND_TYPE: z.literal("ts3"),
    TS3_HOST: z.string(),
    TS3_PASSWORD: z.string(),
    TS3_NICKNAME: z.string().optional(),
    TS3_USERNAME: z.string(),
  })
  .and(baseEnvSchema);
export type TsApiTs3 = z.infer<typeof tsApiTs3>;

const tsApiCustom = z
  .object({
    BACKEND_TYPE: z.literal("customApi"),
    BACKEND_URL: z.string(),
    BACKEND_WS_URL: z.string(),
    BACKEND_TOKEN: z.string(),
  })
  .and(baseEnvSchema);

export type TsApiCustom = z.infer<typeof tsApiCustom>;

const envSchema = tsApiTs3.or(tsApiCustom).catch((e) => {
  logger.info("❌ invalid env vars:");
  logger.warn(e.error.message);
  throw e;
});

export const envVars = envSchema.parse(process.env);
logger.info(`✅ loaded env vars BACKEND_TYPE: ${envVars.BACKEND_TYPE}`);
