// engine class and export it
// engines get created with a table_name and a TS type

import { isDate } from "util/types";
import { initializeDatabase, getDatabase } from ".";
import {
  formatDatetimeToDate,
  formatDateToDatetime,
  isDatetime,
  isTimestamp,
} from "./datetime";

export enum dbOrder {
  ASC = "ASC",
  DESC = "DESC",
}

type dbSelectOptions<T, C = Array<keyof T>> = {
  fields?: C;
  limit?: number;
  order?: {
    by: keyof T;
    direction?: dbOrder;
  };
  engine_join?: {
    select?: string;
    base?: string;
  };
  engine?: {
    debug?: boolean;
  };
};

type dbUpdateStatement = {
  changes: number;
};

const dbWhereOperators = {
  $gt: ">",
  $gte: ">=",
  $lt: "<",
  $lte: "<=",
  $ne: "<>",
  $e: "=",
};

const dbUpdateOperators = {
  $set: "=",
  $inc: "+",
  $dec: "-",
  $mul: "*",
  $div: "/",
};

const enum dbSeparators {
  "AND" = "AND",
  "OR" = "OR",
}

// WHERE
type dbWhereOperatorType = keyof typeof dbWhereOperators;

type dbWhereOperations<T> =
  | dbWhereOperationExact<T>
  | dbWhereOperationExact<T>[];

type dbWhereOperationExact<T> = {
  [K in keyof T]?: dbWhereOperationValue<T[K]>;
};

type dbWhereOPerationOpValue<T> = {
  [Z in keyof typeof dbWhereOperators]?: T | T[];
};

type dbWhereOperationValue<T> =
  | T
  | T[]
  | dbWhereOPerationOpValue<T>
  | dbWhereOPerationOpValue<T>[];

// UPDATE
type dbUpdateOperations<T> = dbUpdateOperationExact<T>;

type dbUpdateOperationExact<T> = {
  [K in keyof T]?: dbUpdateOperationValue<T[K]>;
};

type dbUpdateOperationValue<T> = T extends number
  ? dbUpdateOperationOpValue<T> | T
  : T;

type dbUpdateOperationOpValue<T> = {
  [Z in keyof typeof dbUpdateOperators]?: T;
};

// T = table value type
// I = table insertable value type
class ORM<T, I> {
  constructor(readonly table_name: string) {}

  private formatWhereQuery = (where: dbWhereOperations<T>) => {
    let where_string: string = "";
    let values: dbWhereOperationExact<T>[Extract<keyof T, string>][] = [];

    const operatorKeys: dbWhereOperatorType[] = Object.keys(
      dbWhereOperators
    ) as dbWhereOperatorType[];

    const isParentWhere = Array.isArray(where);

    if (isParentWhere) {
      // add ()
      for (let subWhere of where) {
        where_string += "(";
        const { where_string: nextWhereString, values: subValues } =
          this.formatWhereQuery(subWhere);
        where_string += nextWhereString;
        where_string += ")";
        values.push(...subValues);
        where_string += " OR ";
      }
      // TODO: BETTER SOLUTION THAN -4
      where_string = where_string.slice(0, -4);
    } else {
      if (Object.values(where).length == 0) {
        where_string = "1";
      }
      let whereArray: string[] = [];
      let specialSeparator: { [key: string]: dbSeparators } = {};

      for (let key in where) {
        let value: any = where[key as keyof T];
        if (value instanceof Date) {
          value = formatDateToDatetime(value);
        }

        if (typeof value == "object") {
          if (Array.isArray(value)) {
            values.push(value);
            let where_string = `${key} = ?`;
            whereArray.push(where_string);
          } else {
            for (let operator of operatorKeys) {
              if (value) {
                const newValue = value[operator as keyof typeof value];
                if (newValue != undefined) {
                  if (operator == "$ne") {
                    specialSeparator[values.length] = dbSeparators.AND;
                  }
                  whereArray.push(`${key} ${dbWhereOperators[operator]} ?`);
                  values.push(newValue);
                }
              }
            }
          }
        } else {
          whereArray.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (where_string.endsWith("AND ")) {
        where_string = where_string.slice(0, -5);
      }

      for (let i = 0; i < whereArray.length; i++) {
        const key = whereArray[i];
        const value = values.shift();
        const separator: dbSeparators = specialSeparator[i] ?? dbSeparators.OR;
        if (typeof value == "object" && Array.isArray(value)) {
          if (value.length > 0) {
            where_string += "(";
            for (let val of value) {
              where_string += `${key} ${separator} `;
              values.push(val);
            }
            where_string = where_string.slice(0, -(separator.length + 2));
            where_string += ")";
            where_string += " AND ";
          }
        } else {
          where_string += `${key}`;
          values.push(value);
          where_string += " AND ";
        }
      }
      if (where_string.endsWith("AND ")) {
        where_string = where_string.slice(0, -5);
      }
    }

    return {
      where_string,
      values,
    };
  };

  async delete(where: dbWhereOperations<T>): Promise<void> {
    // attempt db initialize
    await initializeDatabase().catch((err) => {});

    // get db
    const DB = getDatabase();

    const { where_string, values } = this.formatWhereQuery(where);

    const sql = `DELETE FROM ${this.table_name} WHERE ${where_string}`;

    await DB.run(sql, values);
    return;
  }

  async select<T1 extends T, C extends Array<keyof T>>(
    where?: dbWhereOperations<T>,
    options?: dbSelectOptions<T, C>
  ): Promise<Pick<T, C[number]>[]> {
    // attempt db initialize
    await initializeDatabase().catch((err) => {});

    // get db
    const DB = getDatabase();

    const fields: (keyof T | string)[] = options?.fields ?? ["*"];

    let fields_string = fields
      .map((field: string | keyof T) => {
        if (typeof field == "string" && field.includes(".")) {
          return `${field} as "${field}"`;
        }
        return field;
      })
      .join(", ");

    if (fields_string == "* as *") {
      fields_string = this.table_name + ".*";

      if (options?.engine_join?.select) {
        fields_string += `, ${options?.engine_join?.select}`;
      }
    }

    const { where_string, values } = this.formatWhereQuery(where ?? {});

    var sql = `SELECT ${fields_string}`;

    sql += ` FROM ${this.table_name}`;

    if (options?.engine_join?.base) {
      sql += ` ${options.engine_join.base ?? ""}`;
    }

    if (where_string) {
      sql += ` WHERE ${where_string}`;
    }

    if (options?.order) {
      sql += ` ORDER BY ${String(options.order.by)} ${
        options.order.direction ?? dbOrder.ASC
      }`;
    }

    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }

    sql += ";";

    if (options?.engine?.debug) console.log(sql);

    let results = await DB.all(sql, values);

    for (let result of results) {
      let keys = Object.keys(result);
      for (let key of keys) {
        let oldKey = key;
        let newKey = key;
        if (oldKey != newKey) {
          result[newKey] = result[oldKey];
          delete result[oldKey];
        }
      }
    }

    return results.map((row) => {
      for (const key in row) {
        if (isDatetime(row[key]) || isDate(row[key]) || isTimestamp(row[key])) {
          row[key] = formatDatetimeToDate(row[key]);
        }
      }
      return row;
    });
  }

  async count<T1 extends T, C extends Array<keyof T>>(
    where?: dbWhereOperations<T1>,
    options?: dbSelectOptions<T1, C>
  ): Promise<number> {
    // attempt db initialize
    await initializeDatabase().catch((err) => {});

    // get db
    const DB = getDatabase();

    const { where_string, values } = this.formatWhereQuery(where ?? {});

    var sql = `SELECT COUNT(*) as count FROM ${this.table_name}`;

    if (where_string) {
      sql += ` WHERE ${where_string}`;
    }

    sql += ";";

    let results = await DB.all(sql, values);

    return results[0].count;
  }

  async selectOne<C extends Array<keyof T>>(
    where?: dbWhereOperations<T>,
    options?: dbSelectOptions<T, C>
  ): Promise<null | Pick<T, C[number]>> {
    if (!options) {
      options = {};
    }
    if (
      options.limit == 1 ||
      options.limit == null ||
      options.limit == undefined
    ) {
      options.limit = 1;
    } else {
      throw new Error("selectOne only supports a limit of 1");
    }
    const result = await this.select(where, options);
    if (result.length == 0) {
      return null;
    }
    return result[0];
  }

  private insertQuery(obj: I extends Object ? I : never) {
    const keys = Object.keys(obj);

    const keys_string = keys.map((key) => `${key}`).join(", ");

    const values_string = keys.map(() => `?`).join(", ");

    const values = keys.map((key) => {
      const val: any = obj[key as keyof typeof obj];
      if (isDate(val) || isDatetime(val) || isTimestamp(val)) {
        return formatDateToDatetime(val);
      }
      return val;
    });

    let sql = `INSERT INTO ${this.table_name}`;
    if (keys.length > 0 && values.length > 0) {
      sql += ` (${keys_string}) VALUES (${values_string})`;
    } else {
      sql += ` DEFAULT VALUES`;
    }
    sql += ` returning *;`;
    return { sql, values };
  }

  async insert(obj: I extends Object ? I : never): Promise<T> {
    // attempt db initialize
    await initializeDatabase().catch((err) => {});

    // get db
    const DB = getDatabase();

    const insertQuery = this.insertQuery(obj);

    let results = await DB.all(insertQuery.sql, insertQuery.values);
    results = results.map((row) => {
      for (const key in row) {
        if (isDatetime(row[key]) || isDate(row[key]) || isTimestamp(row[key])) {
          row[key] = formatDatetimeToDate(row[key]);
        }
      }
      return row;
    });
    return results[0];
  }

  async insertMany(obj: (I extends Object ? I : never)[]): Promise<T[]> {
    // attempt db initialize
    await initializeDatabase().catch((err) => {});

    if (obj.length > 50) {
      throw new Error("insertMany only supports a max of 50 objects");
    }

    const results = [];
    for (const o of obj) {
      const res = await this.insert(o);
      results.push(res);
    }

    return results;
  }

  async update(
    obj: dbUpdateOperations<T>,
    where?: dbWhereOperations<T>
  ): Promise<dbUpdateStatement> {
    // attempt db initialize
    await initializeDatabase().catch((err) => {});

    // get db
    const DB = getDatabase();

    const { where_string, values } = this.formatWhereQuery(where ?? {});

    const keys = Object.keys(obj);
    const keys_string = keys
      .map((key) => {
        if (
          typeof obj[key as keyof typeof obj] == "object" && 
          !isDate(obj[key as keyof typeof obj])
        ) {
          let str = "";
          let updates: string[] = [];
          for (let valOperation in obj[key as keyof typeof obj]) {
            let operator: string =
              dbUpdateOperators[valOperation as keyof typeof dbUpdateOperators];
            if (operator !== dbUpdateOperators["$set"]) {
              operator = `= ${key} ${operator}`;
            }
            updates.push(`${key} ${operator} ?`);
          }
          str += updates.join(", ");
          str += "";
          if (str === "") return null;
          return str;
        }
        return `${key} = ?`;
      })
      .filter((ks) => ks)
      .join(", ");

    const sql = `UPDATE ${this.table_name} SET ${keys_string} WHERE ${where_string}`;

    const insertValues = Object.values(obj).map((val) => {
      if (isDate(val)) {
        return formatDateToDatetime(val);
      }
      return val;
    });

    const res = await DB.run(sql, [...insertValues, ...values]);
    return { changes: res.changes ?? 0 };
  }

  // async upsert(obj: Partial<T>): Promise<void> {
  //   // attempt db initialize
  //   await initializeDatabase().catch((err) => {});

  //   // get db
  //   const DB = getDatabase();

  //   const keys = Object.keys(obj);
  //   const values = Object.values(obj);

  //   const keys_string = keys.join(", ");
  //   const values_string = values.map(() => "?").join(", ");

  //   const sql = `INSERT OR REPLACE INTO ${this.table_name} (${keys_string}) VALUES (${values_string});`;
  //   await DB.run(sql, values);
  //   return;
  // }
}

type stringMap = {
  [key: string]: any;
};

type dbJoinType = "LEFT"; // "RIGHT" | "FULL"; not supported in SQLite

export class JoinedORM<
  T1,
  T1S extends stringMap,
  I1,
  T2,
  T2S extends stringMap,
  I2
> extends ORM<any, any> {
  left: ORM<T1S, I1>;
  right: ORM<T2S, I2>;

  left_join: keyof T1S;
  right_join: keyof T2S;

  constructor(
    primaryEngine: ORM<any, any>,
    secondaryEngine: ORM<any, any>,
    left_join: keyof T1S,
    right_join: keyof T2S
  ) {
    super(primaryEngine.table_name);
    this.left = primaryEngine;
    this.right = secondaryEngine;
    this.left_join = left_join;
    this.right_join = right_join;
  }

  async select<T extends T1S & T2S, C extends Array<keyof T>>(
    where?: dbWhereOperations<T>,
    options?: dbSelectOptions<T, C>,
    join_type: dbJoinType = "LEFT"
  ): Promise<Pick<T, C[number]>[]> {
    return await super.select(where, {
      ...options,
      engine_join: {
        select: this.right.table_name + ".*",
        base:
          join_type +
          " JOIN " +
          this.right.table_name +
          " ON " +
          String(this.left_join) +
          " = " +
          String(this.right_join),
      },
    });
  }

  async selectOne<T extends T1S & T2S, C extends Array<keyof T>>(
    where?: dbWhereOperations<T>,
    options?: dbSelectOptions<T, C>,
    join_type: dbJoinType = "LEFT"
  ): Promise<Pick<T, C[number]> | null> {
    return await super.selectOne(where, {
      ...options,
      engine_join: {
        select: this.right.table_name + ".*",
        base:
          join_type +
          " JOIN " +
          this.right.table_name +
          " ON " +
          String(this.left_join) +
          " = " +
          String(this.right_join),
      },
    });
  }
}

export default ORM;
