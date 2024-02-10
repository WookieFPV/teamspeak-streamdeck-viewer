import { QueryProtocol, TeamSpeak } from "ts3-nodejs-library";
import { envVars } from "../envVars";


export const tsConnect = async () => {
  console.log(`ts connect (${envVars.TS3_HOST})`)
  const ts = await TeamSpeak.connect({
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

  ts.on("close", async (error): Promise<void> => {
    console.log(`disconnected, trying to reconnect... ${error}`);
    console.warn(error)
    await ts.reconnect(-1, 3000);
    console.log("reconnected!");
  });

  ts.on("error", e => {
    console.log(`ts3 error: ${e}`);
    console.warn(e)
  })

  console.log("ts Connected")
  return ts
}
