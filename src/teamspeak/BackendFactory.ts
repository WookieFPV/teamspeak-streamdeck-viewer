import {TeamSpeakClient} from "./teamspeakTypes";
import {TsBackendCustomApi} from "./backendCustomApi/TsBackendCustomApi";
import {envVars} from "~/envVars";
import {TsBackendTsApi} from "./backendTs3/TsBackendTsApi";

export interface TsBackend {
    getClients({forceRefresh}: { forceRefresh?: boolean }): Promise<TeamSpeakClient[]>;
}

class TsBackendFactory {
    static getBackend(vars: typeof envVars): TsBackend {
        switch (vars.BACKEND_TYPE) {
            case "customApi":
                return new TsBackendCustomApi(vars);
            case "ts3":
                return new TsBackendTsApi(vars);
            default:
                throw new Error(`Invalid backend type`);
        }
    }
}

export const TsBackend = TsBackendFactory.getBackend(envVars)
