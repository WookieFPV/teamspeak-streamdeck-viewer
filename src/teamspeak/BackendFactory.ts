import type { envVars } from "~/envVars";
import { TsBackendCustomApi } from "./backendCustomApi/TsBackendCustomApi";
import { TsBackendTsApi } from "./backendTs3/TsBackendTsApi";
import type { TeamSpeakClient } from "./teamspeakTypes";

export interface TsBackend {
  getClients({
    forceRefresh,
  }: { forceRefresh?: boolean }): Promise<TeamSpeakClient[]>;
}

export function getTsBackend(vars: typeof envVars): TsBackend {
  switch (vars.BACKEND_TYPE) {
    case "customApi":
      return new TsBackendCustomApi(vars);
    case "ts3":
      return new TsBackendTsApi(vars);
    default:
      throw new Error("Invalid backend type");
  }
}
