import wretch from "wretch"
import {envVars} from "../envVars";
import {TeamSpeakChannel, TeamSpeakClient} from "./teamspeakTypes";

const tsFetcher = wretch(envVars.BACKEND_URL)
    .auth(`Bearer ${envVars.BACKEND_TOKEN}`)
    .options({credentials: "include", mode: "cors"})

const getClients = (): Promise<TeamSpeakClient[]> =>
    tsFetcher.get("/ts/users").json()

const getChannels = (): Promise<TeamSpeakChannel[]> =>
    tsFetcher.get("/ts/channels").json()

export const ts3Api = {
    getClients,
    getChannels
}
