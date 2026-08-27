import { formatDriverName, joinConnectionString, sslPairs, timeoutPair, withDsnOrPairs } from "../format.js";

/**
 * MariaDB connection strings (ODBC / ADO.NET).
 * Kept separate from MySQL so MySQL-only flags are not inherited.
 *
 * @param {import("../index.js").ConnectionValues} values
 * @param {"odbc" | "adonet"} format
 */
export function buildMariadb(values, format) {
  const timeout = timeoutPair(values, format);
  const ssl = sslPairs(values, format);
  const charsetOdbc = values.charset ? { CharSet: values.charset } : {};
  const charsetAdo = values.charset ? { "Character Set": values.charset } : {};

  if (format === "odbc") {
    return withDsnOrPairs(values, {
      Driver: formatDriverName(values.driverName),
      Server: values.host,
      Port: values.port,
      Database: values.database,
      Uid: values.username,
      Pwd: values.password,
      ...charsetOdbc,
      ...ssl,
      ...timeout,
    });
  }

  return joinConnectionString({
    Server: values.host,
    Port: values.port,
    Database: values.database,
    Uid: values.username,
    Pwd: values.password,
    ...charsetAdo,
    ...ssl,
    ...timeout,
  });
}
