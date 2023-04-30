import http from "http";
import SteamID from "steamid";
import { SteamContext } from "../steamapi/types";
import { SteamGame, SteamUser, SteamUserOwnedGame } from "../database/generated/types";
import { ShareGroupTable, SteamGameTable, SteamInvalidGameTable, SteamUserOwnedGameTable, SteamUserTable } from "../database/generated/engines";
import { GetGameInfo, GetOwnedGames, GetPlayerSummaries, ResolveVanityURL } from "../steamapi";
import { randomUUID } from "crypto";

export async function GetPlayerLookup (req: http.IncomingMessage, ctx: SteamContext, search: URLSearchParams): Promise<SteamUser> {
    const steam_input = search.get('steam_input');
    if (!steam_input) {
        throw new Error("No steam_input provided");
    }
    var steamUser: SteamUser | undefined = await SteamUserTable.selectOne([
        {
            steam_id: steam_input
        },
        {
            vanity_url: steam_input
        }
    ]) as SteamUser | undefined;

    if (steamUser) {
        const foundByVanity = steamUser.vanity_url === steam_input;
        if (foundByVanity && steamUser.vanity_last_update.getTime() < Date.now() - 1000 * 60 * 60 * 24) {
            steamUser = undefined;
        } else {
            return steamUser;
        }
    }
    try {
        var steamid = new SteamID(steam_input);
        var foundByVanity = false;
    } catch (err) {
        steamid = await ResolveVanityURL(ctx, steam_input);
        foundByVanity = true;
    }

    if (foundByVanity) {
        steamUser = await SteamUserTable.selectOne({
            steam_id: steamid.getSteamID64()
        }) as SteamUser | undefined;
    }
    if (foundByVanity && steamUser) {
        await SteamUserTable.update({
            vanity_last_update: new Date(),
            vanity_url: steam_input
        }, {
            steam_id: steamid.getSteamID64()
        });
        return {
            ...steamUser,
            vanity_last_update: new Date(),
            vanity_url: steam_input
        };
    }
    
    const summaries = await GetPlayerSummaries(ctx, [steamid.getSteamID64()]);
    if (summaries.response.players.length === 0) {
        throw new Error("No player found");
    }
    const inserted = await SteamUserTable.insert({
        steam_id: steamid.getSteamID64(),
        avatar_hash: summaries.response.players[0].avatarhash,
        username: summaries.response.players[0].personaname,
        last_update: new Date(),
        vanity_last_update: foundByVanity ? new Date() : undefined,
        vanity_url: foundByVanity ? steam_input : undefined
    });

    return inserted;
}

export async function GetPlayerPreload(req: http.IncomingMessage, ctx: SteamContext, search: URLSearchParams) {
    const steam_input = search.get('steam_input');
    if (!steam_input) {
        throw new Error("No steam_input provided");
    }

    const hard_reload = search.get('hard_reload') === 'true';

    const steamUser = await GetPlayerLookup(req, ctx, search);

    const gamesOwned = await SteamUserOwnedGameTable.select({
        steam_id: steamUser.steam_id
    });

    const ownedGames = await GetOwnedGames(ctx, steamUser.steam_id);
    if (ownedGames.response.game_count === 0) {
        return { success: true }
    }
    if (Object.keys(ownedGames.response).length === 0) {
        throw new Error("Privacy settings prevent access to owned games");
    }
    let games = ownedGames.response.games.sort((a, b) => b.playtime_forever - a.playtime_forever);

    games = games.filter(game => !gamesOwned.find(g => g.appid === game.appid));

    if (games.length === 0 && !hard_reload && steamUser.last_update.getTime() > Date.now() - 1000 * 60 * 60 * 24 * 1) {
        return { success: true }
    }

    console.log(`Preloading ${games.length} games for ${steamUser.username}`)

    let stop = false;

    req.once("close", () => {
        stop = true;
        console.log("stopping")
    })

    for (const game of games) {
        if (stop) break;
        try {
            // Force load game details if not exist
            await GetGameDetails(req, ctx, new URLSearchParams({
                appid: game.appid.toString()
            }));
        } catch (err) {
            console.error("Failed loading details", err)
        }
        try {
            await SteamUserOwnedGameTable.insert({
                steam_id: steamUser.steam_id,
                appid: game.appid,
                playtime_forever: game.playtime_forever
            });
        } catch (err) {}
        console.log(`Preloaded ${game.appid} (${games.indexOf(game) + 1} / ${games.length})`)
    }

    try {
        await SteamUserTable.update({
            last_update: new Date()
        }, {
            steam_id: steamUser.steam_id
        });
    } catch (err) {
        console.log("err", err)
    }

    return { success: true };
}

let countTimesRun = 0;
const lastRun = new Date(0);

let countTimesRunGlobal = 0;
const lastRunGlobal = new Date(0);

export async function GetGameDetails (req: http.IncomingMessage, ctx: SteamContext, search: URLSearchParams): Promise<SteamGame | null> {
    const appid = parseInt(search.get('appid') || '');
    if (!appid) {
        throw new Error("No appid provided");
    }
    if (isNaN(appid)) {
        throw new Error("Invalid appid provided");
    }
    
    const invalid = await SteamInvalidGameTable.selectOne({
        appid
    })
    if (invalid) return null;

    const steamGame = await SteamGameTable.selectOne({
        appid
    });
    if (steamGame) {
        return steamGame;
    }

    // if lastRun is more than 1 minute ago, reset countTimesRun
    if (lastRun.getTime() < Date.now() - 1000 * 60) {
        lastRun.setTime(Date.now());
        countTimesRun = 0;
    }
    // if lastRunGlobal is more than 5 minutes ago, reset countTimesRunGlobal
    if (lastRunGlobal.getTime() < Date.now() - 1000 * 60 * 5) {
        lastRunGlobal.setTime(Date.now());
        countTimesRunGlobal = 0;
    }

    // dont allow more than 99 requests per minute
    if (countTimesRun > 99) {
        // await until next minute
        await new Promise(resolve => setTimeout(resolve, 1000 * 60 - (Date.now() - lastRun.getTime())));
        return GetGameDetails(req, ctx, search);
    } else {
        countTimesRun++;
    }

    // dont allow more than 199 requests per 5 minutes
    if (countTimesRunGlobal > 199) {
        // await until 5 minutes have passed
        await new Promise(resolve => setTimeout(resolve, 1000 * 60 * 5 - (Date.now() - lastRunGlobal.getTime())));
        return GetGameDetails(req, ctx, search);
    } else {
        countTimesRunGlobal++;
    }

    const gameInfo = await GetGameInfo(ctx, appid);
    if (gameInfo == null) {
        console.log("Rate limited")
        countTimesRun = 100;
        return GetGameDetails(req, ctx, search);
    }

    if (!gameInfo[appid].success) {
        await SteamInvalidGameTable.insert({
            appid
        });
        return null;
    }

    const game = gameInfo[appid].data;

    if (game.type !== "game") {
        await SteamInvalidGameTable.insert({
            appid
        });
        return null;
    }

    const inserted = await SteamGameTable.insert({
        appid: appid,
        name: game.name,
        type: game.type,
        is_free: game.is_free,
        multiplayer: (game.categories ?? []).some(c => c.id === 1 || c.id == 36),
        coop: (game.categories ?? []).some(c => c.id === 38 || c.id == 9),
        mmo: (game.categories ?? []).some(c => c.id === 29),
        vr: (game.categories ?? []).some(c => c.id === 54 || c.id == 28),
        recommendations: game.recommendations?.total  ?? 0,
        background_image: game.background,
        developers: (game.developers ?? []).join(", "),
        header_image: game.header_image,
        website: game.website ?? ""
    });

    return inserted;
}

export async function CreateGroup(req: http.IncomingMessage, ctx: SteamContext, search: URLSearchParams) {
    const steam_inputs = search.get("steam_inputs")?.split(",") ?? [];

    if (steam_inputs.length < 2) {
        throw new Error("Not enough steam_inputs provided");
    }

    if (steam_inputs.length > 10) {
        throw new Error("Too many steam_inputs provided");
    }
    
    const steamUsers = await SteamUserTable.select([
        {
            steam_id: steam_inputs
        },
        {
            vanity_url: steam_inputs,
            vanity_last_update: {
                $gte: new Date(Date.now() - 1000 * 60 * 60 * 24)
            }
        }
    ]);

    if (steamUsers.length !== steam_inputs.length) {
        throw new Error("Not all steam_inputs were preloaded");
    }

    const group = await ShareGroupTable.insert({
        id: randomUUID(),
        steamids: steamUsers.map(s => s.steam_id).join(",")
    })

    return group;
}

export async function GetGroup(req: http.IncomingMessage, ctx: SteamContext, search: URLSearchParams) {
    const group_id = search.get("group_id");
    if (!group_id) {
        throw new Error("No group_id provided");
    }

    const group = await ShareGroupTable.selectOne({
        id: group_id
    });

    if (!group) {
        throw new Error("Invalid group_id provided");
    }
    
    const steamUsers = await SteamUserTable.select({
        steam_id: group.steamids.split(",")
    });

    const gamesOwned = await SteamUserOwnedGameTable.select({
        steam_id: steamUsers.map(s => s.steam_id)
    })
    
    const gamesShared: SteamUserOwnedGame[] = [];
    for (const game of gamesOwned) {
        // if game is owned by all members
        const ownedByAll = gamesOwned.filter(g => g.appid === game.appid).length === steamUsers.length;
        if (ownedByAll) {
            gamesShared.push(game);
        }
    }

    let games = await SteamGameTable.select({
        appid: gamesShared.map(g => g.appid),
        multiplayer: true
    });
    
    // games with playtime
    const gamesWithPlaytime = games.map(game => {
        const playtime: number[] = gamesShared.filter(g => g.appid === game.appid).map(g => g.playtime_forever)
        const reducedPlaytime = playtime.reduce((a, b) => a + b, 0);
        
        return {
            ...game,
            combined_playtime: reducedPlaytime
        }
    });

    return {
        members: steamUsers,
        games: gamesWithPlaytime.sort((a, b) => b.combined_playtime - a.combined_playtime)
    }
}