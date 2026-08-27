import { formatDriverName, joinConnectionString, serverWithColonPort, timeoutPair, withDsnOrPairs } from "../format.js";

/**
 * @param {import("../index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function buildDb2(values, format) {
  const timeout = timeoutPair(values, format);
  const schemaCurrent = values.schema ? { CurrentSchema: values.schema } : {};
  const schemaOledb = values.schema ? { "Default Schema": values.schema } : {};
  const packageCol = values.packageCollection ? { "Package Collection": values.packageCollection } : {};

  if (values.db2ConnectMode === "dbalias") {
    if (format === "odbc") {
      return withDsnOrPairs(values, {
        Driver: formatDriverName(values.driverName),
        DBALIAS: values.dbAlias,
        Uid: values.username,
        Pwd: values.password,
        ...schemaCurrent,
        ...timeout,
      });
    }
    if (format === "adonet") {
      return joinConnectionString({
        Server: values.dbAlias,
        UID: values.username,
        PWD: values.password,
        ...schemaCurrent,
        ...timeout,
      });
    }
  }

  if (format === "odbc") {
    return withDsnOrPairs(values, {
      Driver: formatDriverName(values.driverName),
      Database: values.database,
      Hostname: values.host,
      Port: values.port,
      Protocol: "TCPIP",
      Uid: values.username,
      Pwd: values.password,
      ...schemaCurrent,
      ...timeout,
    });
  }

  if (format === "oledb") {
    return joinConnectionString({
      Provider: values.driverName,
      "Network Transport Library": "TCPIP",
      "Network Address": values.host,
      Port: values.port,
      "Initial Catalog": values.database,
      "User ID": values.username,
      Password: values.password,
      ...schemaOledb,
      ...packageCol,
      ...timeout,
    });
  }

  return joinConnectionString({
    Server: serverWithColonPort(values.host, values.port),
    Database: values.database,
    UID: values.username,
    PWD: values.password,
    ...schemaCurrent,
    ...timeout,
  });
}
