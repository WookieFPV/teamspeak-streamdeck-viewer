import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
// dotenv is loaded when used because esbuild is super optimizing imports...
dotenv.config()

export const envVars = process.env
