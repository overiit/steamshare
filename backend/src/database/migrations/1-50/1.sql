CREATE TABLE steam_game (
    appid INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    background_image TEXT NOT NULL,
    header_image TEXT NOT NULL,
    developers TEXT NOT NULL,
    website TEXT NOT NULL,
    recommendations INTEGER NOT NULL,
    is_free BOOLEAN NOT NULL,
    type TEXT NOT NULL,
    multiplayer BOOLEAN NOT NULL,
    coop BOOLEAN NOT NULL,
    mmo BOOLEAN NOT NULL,
    vr BOOLEAN NOT NULL
);

CREATE TABLE steam_invalid_game (
    appid INTEGER PRIMARY KEY,
    invalidated TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE steam_user (
    steam_id VARCHAR(64) PRIMARY KEY,
    username TEXT NOT NULL,
    vanity_url TEXT,
    avatar_hash TEXT NOT NULL,
    last_update TIMESTAMP NOT NULL,
    vanity_last_update TIMESTAMP
);

CREATE TABLE steam_user_owned_game (
    steam_id VARCHAR(64) NOT NULL REFERENCES steam_user(steam_id),
    appid INTEGER NOT NULL,
    playtime_forever INTEGER NOT NULL,
    UNIQUE(steam_id, appid)
);

CREATE TABLE share_group (
    id VARCHAR(64) PRIMARY KEY,
    steamids TEXT NOT NULL
);