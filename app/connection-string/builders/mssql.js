import {
  formatDriverName,
  joinConnectionString,
  mssqlAuthPairs,
  mssqlEncryptPair,
  mssqlTrustCertPair,
  serverWithPort,
  timeoutPair,
  withDsnOrPairs,
} from "../format.js";

/**
 * @param {import("../index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function buildMssql(values, format) {
  const server = serverWithPort(values.host, values.port, { defaultPort: "1433" });
  const timeout = timeoutPair(values, format);
  const encrypt = mssqlEncryptPair(values, format);
  const trust = mssqlTrustCertPair(values, format);

  if (format === "odbc") {
    return withDsnOrPairs(values, {
      Driver: formatDriverName(values.driverName),
      Server: server,
      Database: values.database,
      ...mssqlAuthPairs(format, values.authMode, {
        odbc: { Uid: values.username, Pwd: values.password },
        other: { UID: values.username, PWD: values.password },
      }),
      ...encrypt,
      ...trust,
      ...timeout,
    });
  }

  if (format === "oledb") {
    const auth =
      values.authMode === "windows"
        ? { Trusted_Connection: "yes" }
        : { UID: values.username, PWD: values.password };

    return joinConnectionString({
      Provider: values.driverName,
      Server: server,
      Database: values.database,
      ...auth,
      ...encrypt,
      ...trust,
      ...timeout,
    });
  }

  const auth =
    values.authMode === "windows"
      ? { Trusted_Connection: "True" }
      : { "User Id": values.username, Password: values.password };

  return joinConnectionString({
    Server: server,
    Database: values.database,
    ...auth,
    ...encrypt,
    ...trust,
    ...timeout,
  });
}
