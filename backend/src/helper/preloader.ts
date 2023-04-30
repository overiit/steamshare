import { SteamGameTable } from "../database/generated/engines";
import { GetApplist } from "../steamapi";
import { SteamContext } from "../steamapi/types";
import { GetGameDetails } from "./queries";
import { blacklisted_names } from "./blacklist_names";
import { IncomingMessage } from "http";

export default async function PreloadGames (req: IncomingMessage, ctx: SteamContext) {
    const applist = await GetApplist(ctx);
    const cachedApps = await SteamGameTable.select({}, {
        fields: [
            "appid",
            "name"
        ]
    })

    // Filter out apps that are already cached
    const apps = applist.applist.apps.filter(app => {
        return (
            !cachedApps.find(cachedApp => cachedApp.appid === app.appid) &&
            !blacklisted_names.find(name => app.name.toLowerCase().includes(name.toLowerCase()))
        )
    }).sort((a, b) => {
        return a.appid - b.appid
    })
    
    for (const app of apps) {
        try {
            await GetGameDetails(req, ctx, new URLSearchParams({
                appid: app.appid.toString()
            }));
        } catch (err) {
            console.error("Failed loading details", err)
        }
        console.log(`Preloaded ${app.appid} ${app.name} (${apps.indexOf(app) + 1} / ${apps.length})`)
    }
}