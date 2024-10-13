import {TeamSpeakClient} from "~/teamspeak/teamspeakTypes";

export const colors = {
    black: "black",
    blue: "blue",
    light_blue: "light_blue",
    red: "red",
    orange: "orange"
} as const

export type Colors = keyof typeof colors

export const clientStateToColor = (client: TeamSpeakClient, mainUser?: TeamSpeakClient): Colors => {
    if (client.clientFlagTalking && mainUser?.cid === client.cid) {
        return "light_blue"
    } else if (client.clientInputMuted && !client.clientOutputMuted) {
        return "orange"
    } else if (client.clientOutputMuted) {
        return "red"
    } else {
        return "blue"
    }
}
