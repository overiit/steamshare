
export type SteamContext = {
    apiKey: string;
    steamid: string;
}

export enum SteamInterface {
    ISteamUser = 'ISteamUser',
    ISteamUserStats = 'ISteamUserStats',
    ISteamUserInventory = 'ISteamUserInventory',
    ISteamUserOAuth = 'ISteamUserOAuth',
    // ...
}

export type GetFriendListResponse = {
    friendslist: {
        friends: {
            steamid: string;
            relationship: string;
            friend_since: number;
        }[]
    }
}

export type GetAppListResponse = {
    applist: {
        apps: {
            appid: number;
            name: string;
        }[];
    }
}

export type GetPlayerSummariesResponse = {
    response: {
        players: {
            steamid: string;
            communityvisibilitystate: number;
            profilestate: number;
            personaname: string;
            profileurl: string;
            avatar: string;
            avatarmedium: string;
            avatarfull: string;
            avatarhash: string;
            lastlogoff: number;
            personastate: number;
            primaryclanid: string;
            timecreated: number;
            personastateflags: number;
        }[]
    }
}

export type GetOwnedGamesResponse = {
    response: {
        game_count: number;
        games: {
            appid: number;
            playtime_forever: number;
            playtime_2weeks: number;
            playtime_windows_forever: number;
            playtime_mac_forever: number;
            playtime_linux_forever: number;
            rtime_last_played: number;
        }[]
    }
}

export type AppDetailsResponse<T extends number> = {
    [key in T]: {
        success: boolean;
        data: {
            type: string;
            name: string;
            steam_appid: number;
            required_age: number;
            is_free: boolean;
            controller_support: string;
            detailed_description: string;
            about_the_game: string;
            short_description: string;
            supported_languages: string;
            header_image: string;
            website: string;
            pc_requirements: {
                minimum: string;
            }
            mac_requirements: {
                minimum: string;
            }
            linux_requirements: {
                minimum: string;
            }
            developers: string[];
            publishers: string[];
            platforms: {
                windows: boolean;
                mac: boolean;
                linux: boolean;
            }
            metacritic: {
                score: number;
                url: string;
            }
            categories?: {
                id: number;
                description: string;
            }[]
            recommendations?: {
                total: number;
            }
            release_date: {
                coming_soon: boolean;
                date: string;
            }
            background: string;
        }
    };
};