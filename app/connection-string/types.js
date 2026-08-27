/** @typedef {"mssql" | "azuresql" | "oracle" | "db2" | "as400" | "mysql" | "mariadb" | "postgresql" | "sqlite" | "redshift" | "firebird" | "teradata"} DatabaseId */
/** @typedef {"odbc" | "oledb" | "adonet"} ConnectionFormat */

/** @type {Record<DatabaseId, { label: string, drivers: ConnectionFormat[] }>} */
export const DATABASES = {
  mssql: { label: "Microsoft SQL Server", drivers: ["odbc", "oledb", "adonet"] },
  azuresql: { label: "Azure SQL Database", drivers: ["odbc", "oledb", "adonet"] },
  oracle: { label: "Oracle", drivers: ["odbc", "oledb", "adonet"] },
  db2: { label: "IBM DB2", drivers: ["odbc", "oledb", "adonet"] },
  as400: { label: "IBM AS/400 (IBM i)", drivers: ["odbc", "oledb", "adonet"] },
  mysql: { label: "MySQL", drivers: ["odbc", "adonet"] },
  mariadb: { label: "MariaDB", drivers: ["odbc", "adonet"] },
  postgresql: { label: "PostgreSQL", drivers: ["odbc", "adonet"] },
  sqlite: { label: "SQLite", drivers: ["odbc", "adonet"] },
  redshift: { label: "Amazon Redshift", drivers: ["odbc", "adonet"] },
  firebird: { label: "Firebird", drivers: ["odbc", "adonet"] },
  teradata: { label: "Teradata", drivers: ["odbc", "oledb", "adonet"] },
};

/** @type {DatabaseId[]} */
export const DATABASE_IDS = [
  "mssql",
  "azuresql",
  "oracle",
  "db2",
  "as400",
  "mysql",
  "mariadb",
  "postgresql",
  "sqlite",
  "redshift",
  "firebird",
  "teradata",
];

/** @type {Record<ConnectionFormat, string>} */
export const FORMAT_LABELS = {
  odbc: "ODBC",
  oledb: "OLE DB",
  adonet: "ADO.NET",
};

/** @deprecated Use ConnectionFormat */
/** @typedef {ConnectionFormat} DriverType */

/** @deprecated Use FORMAT_LABELS */
export const DRIVER_TYPE_LABELS = FORMAT_LABELS;

/**
 * @param {DatabaseId} db
 * @param {ConnectionFormat} format
 */
export function isSupported(db, format) {
  return DATABASES[db]?.drivers.includes(format) ?? false;
}
