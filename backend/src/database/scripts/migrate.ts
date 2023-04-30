import { readdirSync, readFileSync } from "fs";
import { getDatabase, initializeDatabase } from "../";

const migrations_table = "sql_migrations";

const FOLDER_STEPS = 50;

const migrate = async () => {

    console.log("Migrating database");

    // Initialize the database
    await initializeDatabase().catch(() => {});

    // Get the database
    const DB = getDatabase();
    
    // create migrations table
    await DB.run(`CREATE TABLE IF NOT EXISTS ${migrations_table} (id VARCHAR(255) PRIMARY KEY)`, []).catch(console.error);

    await migrateFolder("./src/database/migrations", undefined);
    
    console.log("Successfully migrated...");

};

export const migrateFolder = async (migrations_folder: string, has_grouped_steps: boolean=true) => {

    const STEPS_TO_DO = has_grouped_steps ? FOLDER_STEPS : 1;

    let step = 0;
    // get the last migration id
    let last_migration_id = 1;

    const grouped_folders = has_grouped_steps ? readdirSync(migrations_folder).sort() : [null];

    for (let folder of grouped_folders) {
        const from = step * STEPS_TO_DO + 1;
        const to = (step + 1 ) * STEPS_TO_DO;
        if (has_grouped_steps) {
            const previousFolder = grouped_folders[step - 1];
    
            if (last_migration_id < from) {
                throw new Error(`[Migrations] Migration ${last_migration_id} is missing in folder ${previousFolder}`);
            }
            const expected_folder = `${from}-${to}`;
    
            if (folder !== expected_folder) {
                throw new Error(`[Migrations] Unexpected folder name: ${folder}, expected: ${expected_folder}`);
            }
        }

        if (!folder) folder = "";

        

        let files = readdirSync(`${migrations_folder}/${folder}`).sort((fileA, fileB) => {
            const idA = fileA.split(".")[0];
            const idB = fileB.split(".")[0];

            if (idA === idB) {
                throw new Error(`[Migrations] Two files with the same id: ${idA}`);
            }

            return parseInt(idA) - parseInt(idB);
        });

        if (files.length === 0) {
            break;
        }
    
        for (let file of files) {
            const splitFileName = file.split(".");

            const id = splitFileName[0];
            const extension = splitFileName[splitFileName.length - 1];

            // check if is sql file
            if (extension !== "sql") {
                throw new Error(`[Migrations] Invalid migration file type: ${file}, must be .sql`);
            }

            if (isNaN(parseInt(id))) {
                throw new Error(`[Migrations] Invalid migration id: ${id}, must be a number`);
            }
            
            // check if migration id is valid & incrementing
            if (id !== last_migration_id.toString()) {
                throw new Error(`[Migrations] Invalid migration id: ${id}, expected ${last_migration_id}`);
            }
            if (parseInt(id) < from || parseInt(id) > to) {
                throw new Error(`[Migrations] Unexpected file name: ${id}, expected: ${from}-${to}`);
            }
    
            // TODO: more sophisticated checks for sql statements
            await migrateFile(`${migrations_folder}/${folder}`, file, id);
            
            // increment last migration id
            last_migration_id++;
        }


        step++;
    }
}

export const migrateFile = async (path: string, file: string, migration_name: string) => {
    const DB = getDatabase();
    
    // check if migration has already been run
    const rows = await DB.all(`SELECT id FROM ${migrations_table} WHERE id = '${migration_name}'`, []);
    if (rows.length == 0) {
        // run migration as transaction
        console.log(`Running migration ${migration_name} (${path}/${file})`);
        const sql = readFileSync(`${path}/${file}`, "utf8");
        try {
            await DB.run("BEGIN", []);
            for (let stmt of sql.split(";")) {
                if (stmt.trim() !== "") {
                    await DB.run(stmt, []);
                }
            }
            await DB.run(`INSERT INTO ${migrations_table} VALUES ('${migration_name}')`, []);
            await DB.run("COMMIT", []);
        } catch (err) {
            await DB.run("ROLLBACK", []);
            console.log(`Rolling back migration ${migration_name}`);
            throw err;
        }
    } else {
        console.log(`Migration ${migration_name} already run`);
    }
}

migrate();