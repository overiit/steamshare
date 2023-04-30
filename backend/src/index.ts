import { config } from "dotenv";
import { CreateGroup, GetGroup, GetPlayerLookup, GetPlayerPreload } from "./helper/queries";
import { SteamContext } from "./steamapi/types";

config();

const ctx: SteamContext = {
    apiKey: process.env.STEAM_API || '',
    steamid: process.env.STEAM_ID || ''
}

if (!ctx.apiKey) {
    throw new Error("No API key provided");
}
if (!ctx.steamid) {
    throw new Error("No steamid provided");
}

// http server (only get requests)
import * as http from 'http';
import { URL } from 'url';

const routing: Record<string, Record<string, Function>> = {
    "GET": {
        "/player/lookup": GetPlayerLookup,
        "/player/preload": GetPlayerPreload,
        "/group/create": CreateGroup,
        "/group/view": GetGroup,
    }
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const url = new URL(req.url || '', 'http://localhost:8080');
        const route = routing[req.method || 'GET'][url.pathname];
        if (route) {
            const result = await route(req, ctx, url.searchParams);
            res.write(JSON.stringify({
                success: true,
                result
            }));
        } else {
            res.statusCode = 404;
            res.write(JSON.stringify({
                success: false,
                error: "Route not found"
            }));
        }
    } catch (err: any) {
        res.statusCode = 500;
        res.write(JSON.stringify({
            success: false,
            error: err.message
        }));
    }
    res.end();
});

server.listen(8080, () => {
    console.log("Server listening on port 8080");
})