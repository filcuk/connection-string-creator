import {
  azureEncryptPair,
  formatDriverName,
  joinConnectionString,
  mssqlTrustCertPair,
  serverWithPort,
  timeoutPair,
  withDsnOrPairs,
} from "../format.js";

/**
 * @param {string} host
 * @param {string} port
 */
function azureServer(host, port) {
  const server = serverWithPort(host, port, { defaultPort: "1433" });
  if (!server) return "";
  if (server.startsWith("tcp:")) return server;
  return `tcp:${server}`;
}

/**
 * @param {import("../index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function buildAzuresql(values, format) {
  const server = azureServer(values.host, values.port);
  const timeout = timeoutPair(values, format);
  const encrypt = azureEncryptPair(values, format);
  const trust = mssqlTrustCertPair(values, format);

  if (format === "odbc") {
    return withDsnOrPairs(values, {
      Driver: formatDriverName(values.driverName),
      Server: server,
      Database: values.database,
      Uid: values.username,
      Pwd: values.password,
      ...encrypt,
      ...trust,
      ...timeout,
    });
  }

  if (format === "oledb") {
    return joinConnectionString({
      Provider: values.driverName,
      "Data Source": server,
      "Initial Catalog": values.database,
      UID: values.username,
      PWD: values.password,
      ...encrypt,
      ...trust,
      ...timeout,
    });
  }

  return joinConnectionString({
    Server: server,
    Database: values.database,
    "User ID": values.username,
    Password: values.password,
    Trusted_Connection: "False",
    ...encrypt,
    ...trust,
    ...timeout,
  });
}
