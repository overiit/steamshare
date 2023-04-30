export type SteamUser = {
	steam_id: string;
	username: string;
	vanity_url: string;
	avatar_hash: string;
	last_update: Date;
	vanity_last_update: Date;
}

export type SteamGame = {
	appid: number;
	name: string;
	background_image: string;
	header_image: string;
	developers: string;
	website: string;
	recommendations: number;
	is_free: boolean;
	type: string;
	multiplayer: boolean;
	coop: boolean;
	mmo: boolean;
	vr: boolean;
}