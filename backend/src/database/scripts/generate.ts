import { writeFileSync } from "fs";
import { getDatabase, initializeDatabase } from "../";

type DB_Column = {
    name: string;
    type: string;
    primaryKey: boolean;
    autoIncrement: boolean;
    notNull: boolean;
    defaultValue: string;
};

type DB_ForeignKey = {
    table_to: string;
    column_to: string;
    column_from: string;
}

type DB_Table = {
    table_name: string;
    formatted_name: string;
    type_name: string;
    type_name_i: string;
    type_name_s: string; // strict type values: (table_name.column)
    engine_name: string;
    columns: DB_Column[];
    foreign_keys: DB_ForeignKey[];
}

const SQL_TYPE_MAP: Record<string, string> = {
    "INTEGER": "number",
    "SERIAL": "number",
    "TEXT": "string",
    "REAL": "number",
    "BLOB": "string",
    "BOOLEAN": "boolean",
    "DATETIME": "Date",
    "DATE": "Date",
    "TIME": "`${number}:${number}:${number}`",
    "TIMESTAMP": "Date",
    "VARCHAR": "string",
    "CHAR": "string",
    "INT": "number",
    "BIGINT": "number",
    "FLOAT": "number",
    "DOUBLE": "number",
    "DECIMAL": "number",
    "NUMERIC": "number",
    "BINARY": "string",
    "VARBINARY": "string",
    "CLOB": "string",
    "NCLOB": "string",
    "TINYINT": "number",
    "SMALLINT": "number",
    "MEDIUMINT": "number"
};

const GRAPHQL_TYPE_MAP: Record<string, string> = {
    "INTEGER": "Int",
    "SERIAL": "Int",
    "TEXT": "String",
    "REAL": "Float",
    "BLOB": "String",
    "BOOLEAN": "Boolean",
    "DATETIME": "String",
    "DATE": "String",
    "TIME": "String",
    "TIMESTAMP": "String",
    "VARCHAR": "String",
    "CHAR": "String",
    "INT": "Int",
    "BIGINT": "Int",
    "FLOAT": "Float",
    "DOUBLE": "Float",
    "DECIMAL": "Float",
    "NUMERIC": "Float",
    "BINARY": "String",
    "VARBINARY": "String",
    "CLOB": "String",
    "NCLOB": "String",
    "TINYINT": "Int",
    "SMALLINT": "Int",
    "MEDIUMINT": "Int"
};

const EXPORT_FOLDER = "./src/database/generated/";

const generate = async () => {

    // init db
    await initializeDatabase().catch(() => {});

    // get db
    const DB = getDatabase();

    // get all tables
    const tables_query = await DB.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'sql_%'", []);

    // get all table names
    const tables_names: string[] = tables_query.map(table => table.name).filter(name => name !== "sqlite_sequence");

    const tables: DB_Table[] = [];
    for (let table_name of tables_names) {
        // get table columns
        const columns_query = await DB.all(`PRAGMA table_info(${table_name})`, []);

        const db_columns: DB_Column[] = [];

        let isAutoIncrement = false;

        const result = await DB.get(`SELECT COUNT(*) as count FROM sqlite_master WHERE tbl_name= '${table_name}' AND sql LIKE "%AUTOINCREMENT%"`);
        if (result && result.count == 1) {
            isAutoIncrement = true;
        }

        for (let column of columns_query) {
            const isPrimaryKey = column.pk != 0; // OR should I do == 1?
            db_columns.push({
                name: column.name,
                type: column.type,
                primaryKey: isPrimaryKey,
                autoIncrement: isPrimaryKey && isAutoIncrement,
                notNull: column.notnull === 1,
                defaultValue: column.dflt_value
            })
        }

        // format table name from _ to camelcase
        const formatted_table_name = table_name.replace(/_/g, " ").split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join("");
        const type_name = `${formatted_table_name}`;
        const type_name_i = `${type_name}Insert`;
        const type_name_s = `${type_name}Exact`;
        const engine_name = `${formatted_table_name}Table`;

        // get foreign keys
        const foreign_keys_query = await DB.all(`PRAGMA foreign_key_list(${table_name})`, []);
        const foreign_keys: DB_ForeignKey[] = [];

        for (let key of foreign_keys_query) {
            // TODO??? handle: on_delete, on_update, match, id, seq
            foreign_keys.push({
                table_to: key.table,
                column_to: key.to,
                column_from: key.from
            })
        }

        // get table
        const table: DB_Table = {
            table_name,
            formatted_name: formatted_table_name,
            type_name,
            type_name_i,
            type_name_s,
            engine_name,
            columns: db_columns,
            foreign_keys
        };

        tables.push(table);
            
    }

    const exported_file = EXPORT_FOLDER + "types.ts";
    
    // format DB_Table to TS type
    const formatted_tables = tables.map(table => {

        var insert_required_field_count = 0;

        const formatted_columns = table.columns.map(column => {
            // if has default value, add it and make it optional TS type
            
            var type = column.type.toUpperCase();
            if (type.includes("(")) {
                type = type.substring(0, type.indexOf("("));
            }

            const mappedSQLType = SQL_TYPE_MAP[type];
            if (!mappedSQLType) {
                throw new Error("SQL type not supported yet: " + type);
            }

            const formatted_column = `\t${column.name}: ${mappedSQLType};`;

            const NotRequiredForInsert = column.defaultValue || (column.primaryKey && column.autoIncrement) || !column.notNull;

            let optionalInsertable = NotRequiredForInsert ? "?" : "";

            insert_required_field_count += NotRequiredForInsert ? 1 : 0;

            let defaultComment = column.defaultValue ? `// default: ${column.defaultValue}` : "";

            const insertable = `\t${column.name}${optionalInsertable}: ${SQL_TYPE_MAP[type]}; ${defaultComment}`;
            
            const strict_column = `\t"${table.table_name}.${column.name}": ${SQL_TYPE_MAP[type]};`;
            return {
                formatted: formatted_column,
                strict: strict_column,
                insertable: insertable
            };
        });

        const formatted_columns_string = formatted_columns.map(c => c.formatted).join("\n");
        const insertable_columns_string = formatted_columns.map(c => c.insertable).join("\n");
        const strict_columns_string = formatted_columns.map(c => c.strict).join("\n");

        const insertable_type = 
        // insert_required_field_count == 0 ? [
        //     `export type ${table.type_name_i} = RequireAtLeastOne<${table.type_name}>;`
        // ] : 
        [
            `export type ${table.type_name_i} = {`,
            `${insertable_columns_string}`,
            `}`
        ]

        const formatted_table = [
            `export type ${table.type_name} = {`,
            `${formatted_columns_string}`,
            `}`,
            ``,
            ...insertable_type,
            ``,
            `export type ${table.type_name_s} = {`,
            `${strict_columns_string}`,
            `}`,
            ``,
        ].join("\n");

        return formatted_table;
    })

    // save types to file
    const types_content = [
        "// DO NOT EDIT THIS FILE",
        "// THIS FILE IS AUTO GENERATED",
        `// GENERATED ON ${new Date().toISOString()}`,
        "",
        "import { RequireAtLeastOne } from '../types';",
        "",
        ...formatted_tables,
    ].join("\n");


    writeFileSync(exported_file, types_content);

    console.log(`Saved to ${exported_file}`);

    const types_to_import: string[] = [];

    // create engines
    const engines = tables.map(table => {
        types_to_import.push(table.type_name, table.type_name_i, table.type_name_s);
        return [
            `export const ${table.engine_name} = new ORM<${table.type_name}, ${table.type_name_i}>("${table.table_name}");`,
        ].join("\n");
    });

    const joinedEngines = tables.map(table => {
        let joinedEngines: string[] = [];
        for (let foreign_key of table.foreign_keys) {
            const foreign_table = tables.find(t => t.table_name == foreign_key.table_to);
            if (foreign_table) {
                joinedEngines.push(
                    `export const ${table.formatted_name}${foreign_table.formatted_name}JTable = new JoinedORM<${table.type_name}, ${table.type_name_s}, ${table.type_name_i}, ${foreign_table.type_name}, ${foreign_table.type_name_s}, ${foreign_table.type_name_i}>(${table.engine_name}, ${foreign_table.engine_name}, "${table.table_name}.${foreign_key.column_from}", "${foreign_table.table_name}.${foreign_key.column_to}");`
                )
            } else {
                console.log(`Could not find foreign table ${foreign_key.table_to} for ${table.table_name}`);
            }
        }
        return joinedEngines.join("\n");
    })

    const file_content = [
        "// DO NOT EDIT THIS FILE",
        "// THIS FILE IS AUTO GENERATED",
        `// GENERATED ON ${new Date().toISOString()}`,
        "",
        `import ORM, { JoinedORM } from "../engine";`,
        `import {`,
        `\t${types_to_import.join(",\n\t")}`,
        `} from "./types";`,
        "",
        ...engines,
        ...joinedEngines,
    ];

    // save engines to file
    const engines_content = file_content.join("\n");

    writeFileSync(EXPORT_FOLDER + "engines.ts", engines_content);
    
    console.log(`Saved to ${EXPORT_FOLDER}engines.ts`);
    
    // create graphql types (gql file)
    const gql_types = tables.map(table => {
        return [
            `type ${table.type_name} {`,
            ...table.columns.map(column => {
            
                var type = column.type.toUpperCase();
                if (type.includes("(")) {
                    type = type.substring(0, type.indexOf("("));
                }
                if (!GRAPHQL_TYPE_MAP[type]) {
                    throw new Error("GraphQL type not supported yet: " + type);
                }
                return `\t${column.name}: ${GRAPHQL_TYPE_MAP[type]}!`;
            }),
            `}`,
            // ``,
            // `type ${table.type_name_i} {`,
            // ...table.columns.map(column => {
            
            //     var type = column.type.toUpperCase();
            //     if (type.includes("(")) {
            //         type = type.substring(0, type.indexOf("("));
            //     }
            //     if (!GRAPHQL_TYPE_MAP[type]) {
            //         throw new Error("GraphQL type not supported yet: " + type);
            //     }
            //     return `\t${column.name}: ${GRAPHQL_TYPE_MAP[type]}`;
            // }),
            // `}`,
            // ``,
            // `type ${table.type_name_s} {`,
            // ...table.columns.map(column => {
            
            //     var type = column.type.toUpperCase();
            //     if (type.includes("(")) {
            //         type = type.substring(0, type.indexOf("("));
            //     }
            //     if (!GRAPHQL_TYPE_MAP[type]) {
            //         throw new Error("GraphQL type not supported yet: " + type);
            //     }
            //     return `\t${column.name}: ${GRAPHQL_TYPE_MAP[type]}`;
            // }),
            // `}`,
            ``,
        ].join("\n");
    });

    const gql_content = [
        "# DO NOT EDIT THIS FILE",
        "# THIS FILE IS AUTO GENERATED",
        `# GENERATED ON ${new Date().toISOString()}`,
        "",
        ...gql_types
    ].join("\n");

    writeFileSync(EXPORT_FOLDER  + "database.graphql", gql_content);

    console.log(`Saved to ${EXPORT_FOLDER}database.graphql`);
};

generate();