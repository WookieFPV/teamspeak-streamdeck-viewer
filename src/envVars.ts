import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { z } from "zod";
// dotenv is loaded when used because esbuild is super optimizing imports...
dotenv.config()

const envSchema = z.object({
  BACKEND_URL: z.string(),
  BACKEND_WS_URL: z.string(),
  BACKEND_TOKEN: z.string(),
  TS3_USER_CID: z.string().optional(),

  DEBUG_UI: z.string().optional(),

  STREAMDECK_FONT: z.string().optional(),
  STREAMDECK_USER_FONTSIZE: z.string().optional(),
  STREAMDECK_AFK_FONTSIZE: z.string().optional(),
});

export const envVars = envSchema.parse(process.env);
