/**
 * Quote a connection string value when it contains special characters.
 * Double any embedded quotes per ADO/ODBC rules.
 * @param {string} value
 */
export function quoteValue(value) {
  if (!value) return value;
  if (/[;{}=\s"]/.test(value)) {
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
 * True when host looks like an IPv6 literal (bracketed or multi-colon).
 * @param {string} host
 */
export function isIpv6Literal(host) {
  if (!host) return false;
  if (host.startsWith("[")) return true;
  return (host.match(/:/g) || []).length >= 2;
}

/**
 * Bracket an IPv6 host when needed for Server=host,port / host:port forms.
 * @param {string} host
 */
export function formatHostLiteral(host) {
  const trimmed = host.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[")) return trimmed;
  if (isIpv6Literal(trimmed)) return `[${trimmed}]`;
  return trimmed;
}

/**
 * Combine host and port for drivers that use a single server address (SQL Server style).
 * - Named instances (`server\instance`): omit port when it matches `defaultPort` (or is empty).
 * - IPv6 literals are bracketed so a port can still be appended.
 *
 * @param {string} host
 * @param {string} port
 * @param {{ defaultPort?: string }} [options]
 */
export function serverWithPort(host, port, { defaultPort = "" } = {}) {
  const trimmedHost = host.trim();
  const trimmedPort = port.trim();
  if (!trimmedHost) return "";

  // Already includes a comma port (or explicit host,port).
  if (trimmedHost.includes(",")) return trimmedHost;

  const namedInstance = trimmedHost.includes("\\");
  const ipv6 = isIpv6Literal(trimmedHost);
  const hostPart = formatHostLiteral(trimmedHost);

  if (!trimmedPort) return hostPart;

  // Named instance: skip the engine default port so SQL Browser / instance resolution works.
  if (namedInstance && (!defaultPort || trimmedPort === defaultPort)) {
    return hostPart;
  }

  // Non-IPv6 host that already embeds a colon (unusual for SQL Server) — leave as-is.
  if (!ipv6 && !namedInstance && trimmedHost.includes(":")) {
    return trimmedHost;
  }

  return `${hostPart},${trimmedPort}`;
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

  const ipv6 = isIpv6Literal(trimmedHost);
  const hostPart = formatHostLiteral(trimmedHost);

  if (!trimmedPort) return hostPart;
  if (!ipv6 && trimmedHost.includes(":")) return trimmedHost;
  if (/\]:\d+$/.test(hostPart)) return hostPart;
  return `${hostPart}:${trimmedPort}`;
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
  const hostPart = formatHostLiteral(trimmedHost);
  if (!trimmedDb) return `${hostPart}:${trimmedPort}`;
  return `${hostPart}:${trimmedPort}/${trimmedDb}`;
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
 * Connection timeout keyword for the current database / format.
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function timeoutPair(values, format) {
  if (!values.connectionTimeout) return {};
  const db = values.db;
  const timeout = values.connectionTimeout;

  // Microsoft ODBC Driver for SQL Server documents LoginTimeout.
  if (format === "odbc" && (db === "mssql" || db === "azuresql")) {
    return { LoginTimeout: timeout };
  }

  // Npgsql (PostgreSQL / Redshift ADO.NET style).
  if (format === "adonet" && (db === "postgresql" || db === "redshift")) {
    return { Timeout: timeout };
  }

  return { "Connection Timeout": timeout };
}

/**
 * Always emit Encrypt so ODBC Driver 18+ / modern clients do not keep their default-on.
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function mssqlEncryptPair(values, format) {
  if (format === "adonet") {
    return { Encrypt: values.encrypt ? "True" : "False" };
  }
  return { Encrypt: values.encrypt ? "yes" : "no" };
}

/**
 * Azure SQL encrypt keywords (always emitted).
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function azureEncryptPair(values, format) {
  // Treat undefined as on (Azure expects encryption); explicit false turns it off.
  const encryptOn = values.encrypt !== false;
  if (format === "oledb") {
    return { "Use Encryption for Data": encryptOn ? "true" : "false" };
  }
  if (format === "adonet") {
    return { Encrypt: encryptOn ? "True" : "False" };
  }
  return { Encrypt: encryptOn ? "yes" : "no" };
}

/**
 * TrustServerCertificate for MSSQL / Azure SQL when requested.
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "oledb" | "adonet"} format
 */
export function mssqlTrustCertPair(values, format) {
  if (!values.trustServerCertificate) return {};
  if (format === "adonet") return { TrustServerCertificate: "True" };
  if (format === "oledb") return { TrustServerCertificate: "true" };
  return { TrustServerCertificate: "yes" };
}

/**
 * SSL / TLS keywords for MySQL, MariaDB, PostgreSQL, and Redshift.
 * Always emits a mode so “Off” disables driver defaults (e.g. Npgsql Prefer).
 *
 * @param {import("./index.js").ConnectionValues} values
 * @param {"odbc" | "adonet"} format
 */
export function sslPairs(values, format) {
  const mode = values.sslMode || "off";
  const db = values.db;

  if (format === "adonet") {
    if (db === "postgresql" || db === "redshift") {
      const map = { off: "Disable", preferred: "Prefer", required: "Require" };
      return { "SSL Mode": map[mode] ?? "Disable" };
    }
    if (db === "mysql" || db === "mariadb") {
      const map = { off: "Disabled", preferred: "Preferred", required: "Required" };
      return { SslMode: map[mode] ?? "Disabled" };
    }
    return {};
  }

  if (db === "mysql" || db === "mariadb") {
    const map = { off: "DISABLED", preferred: "PREFERRED", required: "REQUIRED" };
    return { SSLMODE: map[mode] ?? "DISABLED" };
  }
  if (db === "postgresql") {
    const map = { off: "disable", preferred: "prefer", required: "require" };
    return { sslmode: map[mode] ?? "disable" };
  }
  if (db === "redshift") {
    if (mode === "off") return { SSL: "0" };
    return { SSL: "1" };
  }
  return {};
}
