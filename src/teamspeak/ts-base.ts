import { QueryProtocol, TeamSpeak } from "ts3-nodejs-library";
import { envVars } from "../envVars";


export const tsConnect = async () =>
  TeamSpeak.connect({
    host: envVars.TS3_HOST,
    queryport: 10011,
    serverport: 9987,
    protocol: QueryProtocol.RAW,
    username: envVars.TS3_USERNAME,
    nickname: envVars.TS3_NICKNAME,
    password: envVars.TS3_PASSWORD,
  }).catch(e => {
    console.log("tsConnect error", e)
    //an error occurred during connecting
    throw e
  })
