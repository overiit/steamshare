import fetch from "node-fetch";
import { AppDetailsResponse, GetAppListResponse, GetOwnedGamesResponse, GetPlayerSummariesResponse, SteamContext } from "./types";
import SteamID from "steamid";

export async function GetApplist(ctx: SteamContext): Promise<GetAppListResponse> {
    const URL = `https://api.steampowered.com/ISteamApps/GetAppList/v2/`;
    const response = await fetch(URL)
    const data = await response.json();
    return data;
}

export async function ResolveVanityURL (ctx: SteamContext, vanityurl: string) {
    const args = new URLSearchParams({
        key: ctx.apiKey,
        vanityurl
    })
    const URL = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?${args}`;
    const response = await fetch(URL)
    const data = await response.json();
    if (data.response.success !== 1) {
        throw new Error('Could not find steam user');
    }
    const steamid = new SteamID(data.response.steamid);
    if (!steamid.isValidIndividual()) {
        throw new Error('Could not find steam user');
    }
    return steamid;
}

export async function GetPlayerSummaries(ctx: SteamContext, steamids: string[]): Promise<GetPlayerSummariesResponse> {
    if (steamids.length > 100) {
        throw new Error('Cannot request more than 100 steamids at once');
    }
    const args = new URLSearchParams({
        key: ctx.apiKey,
        steamids: steamids.join(',')
    })
    const URL = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${args}`;
    const response = await fetch(URL)

    const data = await response.json();
    return data;
}


export async function GetOwnedGames(ctx: SteamContext, steamid: string): Promise<GetOwnedGamesResponse> {
    const args = new URLSearchParams({
        key: ctx.apiKey,
        steamid,
        include_played_free_games: '1'
    })
    const URL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${args}`;
    const response = await fetch(URL)

    const data = await response.json();
    return data;
}

export async function GetGameInfo<T extends number>(ctx: SteamContext, appid: T): Promise<AppDetailsResponse<T>> {
    const args = new URLSearchParams({
        appids: appid.toString()
    })
    const URL = `https://store.steampowered.com/api/appdetails?${args}`;
    const response = await fetch(URL)

    const data = await response.json();
    return data;
}