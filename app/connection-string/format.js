/**
 * Quote a connection string value when it contains semicolons, braces, or spaces.
 * @param {string} value
 */
export function quoteValue(value) {
  if (!value) return value;
  if (/[;{}=\s]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Wrap a driver or provider name in braces when needed (ODBC drivers).
 * @param {string} name
 * @param {{ brace?: boolean }} [options]
 */
export function formatDriverName(name, { brace = true } = {}) {
  if (!name) return name;
  const trimmed = name.trim();
  if (!brace) return trimmed;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  return `{${trimmed}}`;
}

/**
 * Build a semicolon-delimited connection string from key/value pairs.
 * Empty values are omitted.
 * @param {Record<string, string | undefined | null | boolean>} pairs
 */
export function joinConnectionString(pairs) {
  return Object.entries(pairs)
    .filter(([, value]) => value != null && String(value).length > 0)
    .map(([key, value]) => {
      const normalized = typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
      return `${key}=${quoteValue(normalized)}`;
    })
    .join(";");
}

/**
 * Combine host and port for drivers that use a single server address.
 * @param {string} host
 * @param {string} port
 */
export function serverWithPort(host, port) {
  const trimmedHost = host.trim();
  const trimmedPort = port.trim();
  if (!trimmedHost) return "";
  if (!trimmedPort) return trimmedHost;
  if (trimmedHost.includes(",")) return trimmedHost;
  if (trimmedHost.includes(":") && !trimmedHost.includes("\\")) return trimmedHost;
  return `${trimmedHost},${trimmedPort}`;
}

/**
 * DB2 ADO.NET style Server=host:port
 * @param {string} host
 * @param {string} port
 */
export function serverWithColonPort(host, port) {
  const trimmedHost = host.trim();
  const trimmedPort = port.trim();
  if (!trimmedHost) return "";
  if (!trimmedPort) return trimmedHost;
  if (trimmedHost.includes(":")) return trimmedHost;
  return `${trimmedHost}:${trimmedPort}`;
}

/**
 * Oracle easy-connect style data source: host:port/service
 * @param {string} host
 * @param {string} port
 * @param {string} database
 */
export function oracleEasyConnect(host, port, database) {
  const trimmedHost = host.trim();
  const trimmedPort = port.trim() || "1521";
  const trimmedDb = database.trim();
  if (!trimmedHost) return "";
  if (!trimmedDb) return `${trimmedHost}:${trimmedPort}`;
  return `${trimmedHost}:${trimmedPort}/${trimmedDb}`;
}

/**
 * Oracle TNS-style descriptor.
 * @param {string} host
 * @param {string} port
 * @param {string} serviceName
 */
export function oracleTnsDescriptor(host, port, serviceName) {
  const trimmedHost = host.trim();
  const trimmedPort = port.trim() || "1521";
  const trimmedService = serviceName.trim();
  if (!trimmedHost || !trimmedService) return "";
  return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${trimmedHost})(PORT=${trimmedPort}))(CONNECT_DATA=(SERVICE_NAME=${trimmedService})))`;
}

/**
 * DSN-less ODBC with optional DSN mode.
 * @param {import("./index.js").ConnectionValues} values
 * @param {Record<string, string | undefined | null | boolean>} pairs
 */
export function withDsnOrPairs(values, pairs) {
  if (values.useDsn) {
    return joinConnectionString({
      DSN: values.dsn,
      Uid: values.username,
      Pwd: values.password,
    });
  }
  return joinConnectionString(pairs);
}

/**
 * @param {import("./index.js").ConnectionValues} values
 */
export function oracleDataSource(values) {
  if (values.oracleConnectMode === "tns") {
    return oracleTnsDescriptor(values.host, values.port, values.database);
  }
  return oracleEasyConnect(values.host, values.port, values.database);
}

/**
 * @param {"odbc" | "oledb" | "adonet"} format
 * @param {"sql" | "windows"} authMode
 * @param {{ odbc: Record<string, string>, other: Record<string, string> }} creds
 */
export function mssqlAuthPairs(format, authMode, creds) {
  if (authMode === "windows") {
    if (format === "odbc") return { Trusted_Connection: "yes" };
    if (format === "adonet") return { Trusted_Connection: "True" };
    return { "Integrated Security": "SSPI" };
  }
  return format === "odbc" ? creds.odbc : creds.other;
}

/**
 * @param {"odbc" | "oledb" | "adonet"} format
 * @param {boolean} osAuth
 * @param {{ odbc: Record<string, string>, oledb: Record<string, string>, adonet: Record<string, string> }} creds
 */
export function oracleAuthPairs(format, osAuth, creds) {
  if (osAuth) {
    if (format === "oledb") return { OSAuthent: "1" };
    if (format === "adonet") return { "User Id": "/" };
    return { Uid: "/" };
  }
  if (format === "odbc") return creds.odbc;
  if (format === "oledb") return creds.oledb;
  return creds.adonet;
}

/**
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function timeoutPair(values, format) {
  if (!values.connectionTimeout) return {};
  if (format === "odbc" && values.db === "mssql") {
    return { "Connect Timeout": values.connectionTimeout };
  }
  return { "Connection Timeout": values.connectionTimeout };
}

/**
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function mssqlEncryptPair(values, format) {
  if (!values.encrypt) return {};
  if (format === "adonet") return { Encrypt: "True" };
  return { Encrypt: "yes" };
}

/**
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "adonet"} format
 */
export function sslPairs(values, format) {
  if (!values.sslMode || values.sslMode === "off") return {};
  if (format === "adonet") {
    const mode =
      values.sslMode === "required" ? "Require" : values.sslMode === "preferred" ? "Prefer" : "Disable";
    return { SslMode: mode };
  }
  if (values.sslMode === "required") {
    if (values.db === "mysql" || values.db === "mariadb") return { sslverify: "1" };
    if (values.db === "redshift") return { SSL: "1" };
    if (values.db === "postgresql") return { sslmode: "require" };
  }
  return {};
}
