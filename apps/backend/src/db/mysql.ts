import mysql from "mysql2/promise";

export function createPool(databaseUrl: string) {
  return mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
}

