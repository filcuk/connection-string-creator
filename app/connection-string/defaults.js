/** @typedef {import("./types.js").DatabaseId} DatabaseId */
/** @typedef {import("./types.js").ConnectionFormat} ConnectionFormat */

/** @type {Record<DatabaseId, string>} */
export const DEFAULT_PORTS = {
  mssql: "1433",
  azuresql: "1433",
  oracle: "1521",
  db2: "50000",
  as400: "",
  mysql: "3306",
  mariadb: "3306",
  postgresql: "5432",
  sqlite: "",
  redshift: "5439",
  firebird: "3050",
  teradata: "1025",
};

/** @typedef {{ value: string, label?: string }} DriverPreset */

/** @type {Record<DatabaseId, Partial<Record<ConnectionFormat, DriverPreset[]>>>} */
export const DRIVER_PRESETS = {
  mssql: {
    odbc: [
      { value: "ODBC Driver 18 for SQL Server" },
      { value: "ODBC Driver 17 for SQL Server" },
      { value: "ODBC Driver 13 for SQL Server" },
      { value: "ODBC Driver 11 for SQL Server" },
    ],
    oledb: [
      { value: "MSOLEDBSQL" },
      { value: "SQLNCLI11" },
      { value: "sqloledb", label: "sqloledb (Legacy)" },
    ],
  },
  azuresql: {
    odbc: [
      { value: "ODBC Driver 18 for SQL Server" },
      { value: "ODBC Driver 17 for SQL Server" },
      { value: "SQL Server Native Client 11.0" },
    ],
    oledb: [{ value: "MSOLEDBSQL" }, { value: "SQLNCLI11" }],
  },
  oracle: {
    odbc: [{ value: "Oracle ODBC Driver" }],
    oledb: [{ value: "OraOLEDB.Oracle" }],
  },
  db2: {
    odbc: [{ value: "IBM DB2 ODBC DRIVER" }],
    oledb: [{ value: "DB2OLEDB" }],
  },
  as400: {
    odbc: [
      { value: "IBM i Access ODBC Driver" },
      { value: "iSeries Access ODBC Driver" },
      { value: "Client Access ODBC Driver (32-bit)" },
    ],
    oledb: [{ value: "IBMDA400" }],
  },
  mysql: {
    odbc: [
      { value: "MySQL ODBC 8.0 Unicode Driver" },
      { value: "MySQL ODBC 5.2 Unicode Driver" },
      { value: "MySQL ODBC 5.2 ANSI Driver" },
      { value: "MySQL ODBC 3.51 Driver" },
    ],
  },
  mariadb: {
    odbc: [
      { value: "MariaDB ODBC 3.2 Driver" },
      { value: "MariaDB ODBC 3.1 Driver" },
      { value: "MySQL ODBC 8.0 Unicode Driver" },
    ],
  },
  postgresql: {
    odbc: [
      { value: "PostgreSQL UNICODE" },
      { value: "PostgreSQL ANSI" },
      { value: "PostgreSQL" },
    ],
  },
  sqlite: {
    odbc: [{ value: "SQLite3 ODBC Driver" }],
  },
  redshift: {
    odbc: [{ value: "Amazon Redshift (x64)" }],
  },
  firebird: {
    odbc: [{ value: "Firebird/InterBase(r) driver" }],
  },
  teradata: {
    odbc: [{ value: "Teradata Database ODBC Driver 16.20" }],
    oledb: [
      { value: "TDOLEDB" },
      { value: "Teradata", label: "Teradata OLE DB Provider" },
    ],
  },
};

/**
 * @param {DatabaseId} db
 * @param {ConnectionFormat} format
 * @returns {DriverPreset[]}
 */
export function getDriverPresets(db, format) {
  return DRIVER_PRESETS[db]?.[format] ?? [];
}

/**
 * @param {DatabaseId} db
 * @param {ConnectionFormat} format
 */
export function getDefaultDriver(db, format) {
  return getDriverPresets(db, format)[0]?.value ?? "";
}

/**
 * @param {DatabaseId} db
 */
export function getDefaultPort(db) {
  return DEFAULT_PORTS[db] ?? "";
}

/**
 * Whether encrypt should default on when selecting this database.
 * @param {DatabaseId} db
 */
export function encryptDefaultOn(db) {
  return db === "azuresql";
}
