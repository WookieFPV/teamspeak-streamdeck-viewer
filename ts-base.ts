import {QueryProtocol, TeamSpeak} from "ts3-nodejs-library";

import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
// dotenv is loaded when used because esbuild is super optimizing imports...
dotenv.config()

const envVars = process.env

export const tsConnect = async () =>
  TeamSpeak.connect({
    host: envVars.TS3_HOST,
    queryport: 10011,
    serverport: 9987,
    protocol: QueryProtocol.RAW,
    username:  envVars.TS3_USERNAME,
    nickname:  envVars.TS3_NICKNAME,
    password: envVars.TS3_PASSWORD,
  }).catch(e => {
    console.log("tsConnect error", e)
    //an error occured during connecting
    throw e
  })
