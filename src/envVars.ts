import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
import { z } from "zod";
// dotenv is loaded when used because esbuild is super optimizing imports...
dotenv.config()

let envSchema = z.object({
  TS3_HOST: z.string(),
  TS3_PASSWORD: z.string(),
  TS3_NICKNAME: z.string().optional(),
  TS3_USERNAME: z.string(),
  TS3_USER_CID: z.string().optional(),

  STREAMDECK_FONT: z.string().optional(),
  STREAMDECK_USER_FONTSIZE: z.string().optional(),
  STREAMDECK_AFK_FONTSIZE: z.string().optional(),
});

export const envVars = envSchema.parse(process.env);
