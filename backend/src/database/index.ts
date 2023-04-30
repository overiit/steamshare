import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { mkdir } from 'fs';

let db: Database<sqlite3.Database, sqlite3.Statement>;


const initializeDatabase = async () => {
    if (db) return;

    db = await open({
        filename: `./db.sqlite`,
        driver: sqlite3.Database
    });
};

const saveDatabase = async () => {
    if (!db) {
        throw new Error("Database not initialized");
    }
    await db.close();
}

const getDatabase = () => {
    if (!db) {
        throw new Error("Database not initialized");
    }
    return db;
}

export { initializeDatabase, getDatabase, saveDatabase };