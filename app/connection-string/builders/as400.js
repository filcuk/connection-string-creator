import { formatDriverName, joinConnectionString, timeoutPair, withDsnOrPairs } from "../format.js";

/**
 * IBM i / AS/400 connection strings.
 * @see https://www.connectionstrings.com/as-400/
 *
 * @param {import("../index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function buildAs400(values, format) {
  const timeout = timeoutPair(values, format);
  const system = values.host.trim();
  const collection = values.database.trim();

  if (format === "odbc") {
    return withDsnOrPairs(values, {
      Driver: formatDriverName(values.driverName),
      System: system,
      Uid: values.username,
      Pwd: values.password,
      ...(values.encrypt ? { SSL: "1" } : {}),
      ...timeout,
    });
  }

  if (format === "oledb") {
    return joinConnectionString({
      Provider: values.driverName || "IBMDA400",
      "Data Source": system,
      "User Id": values.username,
      Password: values.password,
      ...(collection ? { "Default Collection": collection } : {}),
      ...timeout,
    });
  }

  return joinConnectionString({
    DataSource: system,
    UserID: values.username,
    Password: values.password,
    DataCompression: "True",
    ...timeout,
  });
}
