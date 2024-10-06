import wretch from "wretch"
import {envVars} from "../envVars";
import {TeamSpeakChannel, TeamSpeakClient} from "./teamspeakTypes";

const ts3Api = wretch(envVars.BACKEND_URL) // Base url
    .auth(`Bearer ${envVars.BACKEND_TOKEN}`)
    .options({credentials: "include", mode: "cors"})

export const getTs3Clients = (): Promise<TeamSpeakClient[]> =>
    ts3Api.get("/ts/users").json()

export const getTs3Channels = (): Promise<TeamSpeakChannel[]> =>
    ts3Api.get("/ts/channels").json()

