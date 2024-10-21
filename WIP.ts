import { QueryObserver } from "@tanstack/query-core";
import { produce } from "immer";
import { queryClient, queryKey } from "~/teamspeak/queryClient";
import type { TeamSpeakClient } from "~/teamspeak/teamspeakTypes";
import { logger } from "~/utils/logger";

export const tsClientJoinNotWORKING = async (client: TeamSpeakClient) =>
  queryClient.setQueriesData<TeamSpeakClient[]>(
    { queryKey: queryKey.clients },
    (oldClients) =>
      produce(oldClients ?? [], (draft) => {
        draft.push(client);
        logger.info(
          "join",
          client.clientNickname,
          JSON.stringify(draft.map((c) => c.clientNickname)),
        );
      }),
  );

export const tsClientLeaveNotWORKING = async (client: TeamSpeakClient) =>
  queryClient.setQueriesData<TeamSpeakClient[]>(
    { queryKey: queryKey.clients },
    (oldClients) =>
      produce(oldClients ?? [], (draft) => {
        logger.info(
          "tsClientLeave",
          client.clientNickname,
          JSON.stringify(draft.map((c) => c.clientNickname)),
        );
        const index = draft.findIndex((todo) => todo.clid === client.clid);
        if (index !== -1) {
          draft.splice(index, 1);
          logger.info(
            "tsClientLeave removed",
            client.clientNickname,
            JSON.stringify(draft.map((c) => c.clientNickname)),
          );
        } else {
          logger.info(
            "tsClientLeave not found",
            client.clientNickname,
            JSON.stringify(draft.map((c) => c.clientNickname)),
          );
        }
      }),
  );

export const tsClientMoveNotWORKING = async (client: TeamSpeakClient) =>
  queryClient.setQueriesData<TeamSpeakClient[]>(
    { queryKey: queryKey.clients },
    (oldClients) =>
      produce(oldClients ?? [], (draft) => {
        const index = draft.findIndex((todo) => todo.clid === client.clid);
        if (index !== -1) {
          logger.info(
            "tsClientMove",
            client.clientNickname,
            JSON.stringify({
              old: `${draft[index]?.clientNickname} -> ${draft[index]?.clientNickname} | ${draft[index]?.clientNickname}`,
              new: `${client.clientNickname} -> ${client.clientNickname} | ${client.clientNickname}`,
            }),
          );
        }

        if (index !== -1) draft[index] = client;
      }),
  );

const observer = new QueryObserver<TeamSpeakClient[]>(queryClient, {
  queryKey: queryKey.clients,
});

const unsubscribe = observer.subscribe((result) => {
  logger.info(
    "Observer",
    JSON.stringify(result.data?.map((c) => c.clientNickname)),
  );
});
