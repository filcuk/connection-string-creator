import { formatDriverName, joinConnectionString, timeoutPair, withDsnOrPairs } from "../format.js";

/**
 * @param {import("../index.js").ConnectionValues} values
 */
function firebirdDbName(values) {
  const file = values.database.trim();
  const host = values.host.trim();
  const port = values.port.trim();

  if (!file) return "";
  if (!host) return file;
  if (port && port !== "3050") return `${host}/${port}:${file}`;
  return `${host}:${file}`;
}

/**
 * @param {import("../index.js").ConnectionValues} values
 * @param {"odbc" | "adonet"} format
 */
export function buildFirebird(values, format) {
  const timeout = timeoutPair(values, format);
  const dbName = firebirdDbName(values);
  const charset = values.charset?.trim() ? { Charset: values.charset.trim() } : {};

  if (format === "odbc") {
    return withDsnOrPairs(values, {
      Driver: formatDriverName(values.driverName),
      UID: values.username,
      PWD: values.password,
      DBNAME: dbName,
      DIALECT: "3",
      ...charset,
      ...timeout,
    });
  }

  return joinConnectionString({
    User: values.username,
    Password: values.password,
    Database: values.database,
    DataSource: values.host,
    Port: values.port,
    Dialect: "3",
    ...charset,
    ...timeout,
  });
}
