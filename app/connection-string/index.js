import { buildAs400 } from "./builders/as400.js";
import { buildAzuresql } from "./builders/azuresql.js";
import { buildDb2 } from "./builders/db2.js";
import { buildFirebird } from "./builders/firebird.js";
import { buildMariadb } from "./builders/mariadb.js";
import { buildMssql } from "./builders/mssql.js";
import { buildMysql } from "./builders/mysql.js";
import { buildOracle } from "./builders/oracle.js";
import { buildPostgresql } from "./builders/postgresql.js";
import { buildRedshift } from "./builders/redshift.js";
import { buildSqlite } from "./builders/sqlite.js";
import { buildTeradata } from "./builders/teradata.js";
import { isSupported } from "./types.js";

/** @typedef {import("./types.js").DatabaseId} DatabaseId */
/** @typedef {import("./types.js").ConnectionFormat} ConnectionFormat */

/**
 * @typedef {Object} ConnectionValues
 * @property {DatabaseId} [db]
 * @property {string} host
 * @property {string} port
 * @property {string} database
 * @property {string} username
 * @property {string} password
 * @property {string} driverName
 * @property {"sql" | "windows"} authMode
 * @property {boolean} osAuth
 * @property {boolean} encrypt
 * @property {boolean} trustServerCertificate
 * @property {string} connectionTimeout
 * @property {boolean} useDsn
 * @property {string} dsn
 * @property {string} schema
 * @property {"hostname" | "dbalias"} db2ConnectMode
 * @property {string} dbAlias
 * @property {"easyconnect" | "tns"} oracleConnectMode
 * @property {string} packageCollection
 * @property {"off" | "preferred" | "required"} sslMode
 * @property {string} charset
 * @property {boolean} sqliteInMemory
 * @property {"2" | "3"} sqliteVersion
 */

/**
 * @param {{ db: DatabaseId, driver: ConnectionFormat, values: ConnectionValues }} options
 * @returns {string}
 */
export function buildConnectionString({ db, driver, values }) {
  if (!isSupported(db, driver)) {
    return "";
  }

  const v = { ...values, db };

  switch (db) {
    case "mssql":
      return buildMssql(v, driver);
    case "azuresql":
      return buildAzuresql(v, driver);
    case "oracle":
      return buildOracle(v, driver);
    case "db2":
      return buildDb2(v, driver);
    case "as400":
      return buildAs400(v, driver);
    case "mysql":
      return buildMysql(v, driver);
    case "mariadb":
      return buildMariadb(v, driver);
    case "redshift":
      return buildRedshift(v, driver);
    case "postgresql":
      return buildPostgresql(v, driver);
    case "sqlite":
      return buildSqlite(v, driver);
    case "firebird":
      return buildFirebird(v, driver);
    case "teradata":
      return buildTeradata(v, driver);
    default:
      return "";
  }
}

export {
  DATABASES,
  DATABASE_IDS,
  DRIVER_TYPE_LABELS,
  FORMAT_LABELS,
  isSupported,
} from "./types.js";
export {
  DEFAULT_PORTS,
  DRIVER_PRESETS,
  encryptDefaultOn,
  getDefaultDriver,
  getDefaultPort,
  getDriverPresets,
} from "./defaults.js";
export { getFieldsForDatabase, getRequiredFieldIds } from "./fields.js";
