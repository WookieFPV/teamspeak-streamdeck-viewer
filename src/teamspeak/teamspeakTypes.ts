export type TeamSpeakClient = {

    // nickname, idleTime, uniqueIdentifier, flagTalking, clientAwayMessage, clientEstimatedLocation, clientBadges
    // clientAwayMessage, clientEstimatedLocation, clientBadges
    /*
     nickname: string | undefined
     idleTime: number
     uniqueIdentifier: string
     flagTalking: boolean
     inputMuted: boolean
     outputMuted: boolean
 */
    clid: string
    cid: string
    clientDatabaseId: string
    clientNickname: string
    clientType: number
    clientAway: boolean
    //   clientAwayMessage: string
    clientFlagTalking: boolean
    clientInputMuted: boolean
    clientOutputMuted: boolean
    clientInputHardware: boolean
    clientOutputHardware: boolean
    clientTalkPower: number
    clientIsTalker: boolean
    clientIsPrioritySpeaker: 0
    clientIsRecording: boolean
    clientIsChannelCommander: boolean
    clientUniqueIdentifier: string
    clientServergroups: string[]
    clientChannelGroupId: string
    clientChannelGroupInheritedChannelId: string
    clientVersion: string
    clientPlatform: string
    clientIdleTime: number
    clientCreated: number
    clientLastconnected: number
    clientCountry: string | undefined
    // clientEstimatedLocation: string | undefined
    connectionClientIp: string
    // clientBadges: string
    clientIconId?: string
}

export type TeamSpeakChannel = {
    cid: string
    pid: string
    channelOrder: number
    channelName: string
    channelTopic?: string
    channelFlagDefault: boolean
    channelFlagPassword: boolean
    channelFlagPermanent: boolean
    channelFlagSemiPermanent: boolean
    channelCodec: unknown
    channelCodecQuality: number
    channelNeededTalkPower: number
    channelIconId: string
    secondsEmpty: number
    totalClientsFamily: number
    channelMaxclients: number
    channelMaxfamilyclients: number
    totalClients: number
    channelNeededSubscribePower: number
    /** only in server version >= 3.11.x */
    channelBannerGfxUrl?: string
    /** only in server version >= 3.11.x */
    channelBannerMode?: number
    _namespace?: string
}
