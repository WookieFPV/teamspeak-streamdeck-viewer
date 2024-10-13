import {TeamSpeakClient as TeamSpeakClientTS3} from "ts3-nodejs-library";
import {TeamSpeakClient} from "../teamspeakTypes";
import {addLastActiveTime} from "~/teamspeak/addLastActiveTime";

const ts3ClientMapper = (client: TeamSpeakClientTS3): TeamSpeakClient => ({
    clientNickname: client.nickname,
    clid: client.clid,
    cid: client.cid,
    clientUniqueIdentifier: client.uniqueIdentifier,
    clientType: client.type,
    clientAway: !!client.away,
    clientFlagTalking: client.flagTalking,
    clientInputMuted: client.inputMuted,
    clientOutputMuted: client.outputMuted,
    connectionClientIp: client.connectionClientIp,
    clientIdleTime: client.idleTime,
    clientLastActiveTime: Date.now() - client.idleTime
})

export const filterAndMapTs3Clients = (clients: TeamSpeakClientTS3[]): TeamSpeakClient[] => clients.filter(c => c.type === 0).map(ts3ClientMapper);
