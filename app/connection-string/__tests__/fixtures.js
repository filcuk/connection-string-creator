/**
 * Shared fixtures for connection-string golden tests.
 * Values are fixed so builders produce deterministic output.
 */

import {
  DATABASE_IDS,
  DATABASES,
  getDefaultDriver,
  getDefaultPort,
} from "../index.js";

/** @typedef {import("../index.js").ConnectionValues} ConnectionValues */
/** @typedef {import("../types.js").DatabaseId} DatabaseId */
/** @typedef {import("../types.js").ConnectionFormat} ConnectionFormat */

/**
 * @param {DatabaseId} db
 * @param {ConnectionFormat} format
 * @param {Partial<ConnectionValues>} [overrides]
 * @returns {ConnectionValues}
 */
export function baseValues(db, format, overrides = {}) {
  return {
    host: "db.example.com",
    port: getDefaultPort(db) || "1433",
    database: "appdb",
    username: "appuser",
    password: "s3cret",
    driverName: getDefaultDriver(db, format),
    authMode: "sql",
    osAuth: false,
    encrypt: false,
    trustServerCertificate: false,
    connectionTimeout: "",
    useDsn: false,
    dsn: "",
    schema: "",
    db2ConnectMode: "hostname",
    dbAlias: "",
    oracleConnectMode: "easyconnect",
    packageCollection: "",
    sslMode: "off",
    charset: "",
    sqliteInMemory: false,
    sqliteVersion: "3",
    ...overrides,
  };
}

/**
 * Scenario definitions. Each yields one golden case when applicable to the db/format.
 *
 * @typedef {{
 *   id: string,
 *   label: string,
 *   applies: (db: DatabaseId, format: ConnectionFormat) => boolean,
 *   values: (db: DatabaseId, format: ConnectionFormat) => Partial<ConnectionValues>,
 * }} Scenario
 */

/** @type {Scenario[]} */
export const SCENARIOS = [
  {
    id: "baseline",
    label: "SQL auth baseline",
    applies: () => true,
    values: () => ({}),
  },
  {
    id: "timeout",
    label: "with connection timeout",
    applies: () => true,
    values: () => ({ connectionTimeout: "30" }),
  },
  {
    id: "encrypt-on",
    label: "encrypt on",
    applies: (db, format) =>
      db === "mssql" ||
      db === "azuresql" ||
      (db === "as400" && format === "odbc"),
    values: () => ({ encrypt: true }),
  },
  {
    id: "encrypt-off",
    label: "encrypt off (explicit)",
    applies: (db) => db === "mssql" || db === "azuresql",
    values: () => ({ encrypt: false }),
  },
  {
    id: "trust-cert",
    label: "trust server certificate",
    applies: (db) => db === "mssql" || db === "azuresql",
    values: () => ({ encrypt: true, trustServerCertificate: true }),
  },
  {
    id: "windows-auth",
    label: "Windows integrated auth",
    applies: (db) => db === "mssql",
    values: () => ({
      authMode: "windows",
      username: "",
      password: "",
    }),
  },
  {
    id: "ipv6",
    label: "IPv6 host with port",
    applies: (db) => db === "mssql" || db === "azuresql",
    values: () => ({
      host: "2001:db8::1",
      port: "1433",
    }),
  },
  {
    id: "named-instance",
    label: "SQL Server named instance with default port",
    applies: (db) => db === "mssql",
    values: (db) => ({
      host: "SERVER\\SQLEXPRESS",
      port: getDefaultPort(db),
    }),
  },
  {
    id: "named-instance-custom-port",
    label: "SQL Server named instance with custom port",
    applies: (db) => db === "mssql",
    values: () => ({
      host: "SERVER\\SQLEXPRESS",
      port: "1434",
    }),
  },
  {
    id: "dsn",
    label: "ODBC DSN mode",
    applies: (_db, format) => format === "odbc",
    values: () => ({
      useDsn: true,
      dsn: "MyDataSource",
    }),
  },
  {
    id: "ssl-off",
    label: "SSL off",
    applies: (db) =>
      ["mysql", "mariadb", "postgresql", "redshift"].includes(db),
    values: () => ({ sslMode: "off" }),
  },
  {
    id: "ssl-preferred",
    label: "SSL preferred",
    applies: (db) =>
      ["mysql", "mariadb", "postgresql", "redshift"].includes(db),
    values: () => ({ sslMode: "preferred" }),
  },
  {
    id: "ssl-required",
    label: "SSL required",
    applies: (db) =>
      ["mysql", "mariadb", "postgresql", "redshift"].includes(db),
    values: () => ({ sslMode: "required" }),
  },
  {
    id: "charset",
    label: "MySQL/MariaDB charset",
    applies: (db, format) =>
      (db === "mysql" || db === "mariadb") && format === "odbc",
    values: () => ({ charset: "utf8mb4" }),
  },
  {
    id: "oracle-easy",
    label: "Oracle Easy Connect",
    applies: (db) => db === "oracle",
    values: () => ({ oracleConnectMode: "easyconnect" }),
  },
  {
    id: "oracle-tns",
    label: "Oracle TNS descriptor",
    applies: (db) => db === "oracle",
    values: () => ({ oracleConnectMode: "tns" }),
  },
  {
    id: "oracle-os-auth",
    label: "Oracle OS authentication",
    applies: (db) => db === "oracle",
    values: () => ({
      osAuth: true,
      username: "",
      password: "",
    }),
  },
  {
    id: "db2-hostname",
    label: "DB2 hostname mode",
    applies: (db) => db === "db2",
    values: () => ({
      db2ConnectMode: "hostname",
      schema: "MYSCHEMA",
    }),
  },
  {
    id: "db2-alias",
    label: "DB2 database alias",
    applies: (db) => db === "db2",
    values: () => ({
      db2ConnectMode: "dbalias",
      dbAlias: "SAMPLE",
      schema: "MYSCHEMA",
    }),
  },
  {
    id: "db2-oledb-package",
    label: "DB2 OLE DB package collection",
    applies: (db, format) => db === "db2" && format === "oledb",
    values: () => ({
      packageCollection: "NULLID",
      schema: "MYSCHEMA",
    }),
  },
  {
    id: "sqlite-file",
    label: "SQLite file path",
    applies: (db) => db === "sqlite",
    values: () => ({
      database: "C:\\data\\app.db",
      host: "",
      port: "",
      username: "",
    }),
  },
  {
    id: "sqlite-memory",
    label: "SQLite in-memory",
    applies: (db) => db === "sqlite",
    values: () => ({
      sqliteInMemory: true,
      database: "",
      host: "",
      port: "",
      username: "",
    }),
  },
  {
    id: "sqlite-v2",
    label: "SQLite ADO.NET version 2",
    applies: (db, format) => db === "sqlite" && format === "adonet",
    values: () => ({
      database: "C:\\data\\app.db",
      host: "",
      port: "",
      username: "",
      sqliteVersion: "2",
      password: "key",
    }),
  },
  {
    id: "firebird-remote",
    label: "Firebird remote file",
    applies: (db) => db === "firebird",
    values: () => ({
      host: "firebird.example.com",
      port: "3050",
      database: "C:\\database\\myData.fdb",
      username: "SYSDBA",
    }),
  },
  {
    id: "firebird-nondefault-port",
    label: "Firebird non-default port",
    applies: (db) => db === "firebird",
    values: () => ({
      host: "firebird.example.com",
      port: "3051",
      database: "/var/db/app.fdb",
      username: "SYSDBA",
    }),
  },
  {
    id: "teradata-tdoledb",
    label: "Teradata TDOLEDB provider",
    applies: (db, format) => db === "teradata" && format === "oledb",
    values: () => ({
      driverName: "TDOLEDB",
      port: "1025",
    }),
  },
  {
    id: "teradata-provider",
    label: "Teradata OLE DB Provider name",
    applies: (db, format) => db === "teradata" && format === "oledb",
    values: () => ({
      driverName: "Teradata",
      port: "1025",
    }),
  },
  {
    id: "password-special",
    label: "password with semicolon and space",
    applies: () => true,
    values: () => ({
      password: "p; a=b",
    }),
  },
];

/**
 * Expand all applicable (db, format, scenario) cases.
 * @returns {{ key: string, db: DatabaseId, format: ConnectionFormat, scenarioId: string, values: ConnectionValues }[]}
 */
export function allCases() {
  /** @type {{ key: string, db: DatabaseId, format: ConnectionFormat, scenarioId: string, values: ConnectionValues }[]} */
  const cases = [];

  for (const db of DATABASE_IDS) {
    for (const format of DATABASES[db].drivers) {
      for (const scenario of SCENARIOS) {
        if (!scenario.applies(db, format)) continue;
        const values = baseValues(db, format, scenario.values(db, format));
        const key = `${db}/${format}/${scenario.id}`;
        cases.push({ key, db, format, scenarioId: scenario.id, values });
      }
    }
  }

  return cases;
}
