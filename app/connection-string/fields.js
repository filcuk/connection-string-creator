/** @typedef {import("./types.js").DatabaseId} DatabaseId */

/** @typedef {{ id: string, label: string, hint?: string, type?: "text" | "password" | "number", placeholder?: string }} FieldDef */

/** @type {FieldDef[]} */
export const SHARED_FIELDS = [
  {
    id: "host",
    label: "Server / host",
    placeholder: "localhost or server\\instance",
  },
  {
    id: "port",
    label: "Port",
    type: "number",
    placeholder: "1433",
  },
  {
    id: "database",
    label: "Database",
    placeholder: "mydb",
  },
  {
    id: "username",
    label: "Username",
    placeholder: "Optional",
  },
  {
    id: "password",
    label: "Password",
    type: "password",
    placeholder: "Optional",
    hint: "All information remains safely in your browser.",
  },
];

/** @type {Partial<Record<DatabaseId, Partial<Record<string, { label?: string, hint?: string, placeholder?: string }>>>>} */
export const FIELD_OVERRIDES = {
  mssql: {
    host: { placeholder: "localhost or server\\instance" },
    database: { hint: "Also called Initial Catalog in OLE DB." },
  },
  azuresql: {
    host: {
      label: "Server",
      placeholder: "myserver.database.windows.net",
      hint: "Use the Azure SQL host name (tcp: prefix is added automatically).",
    },
    username: {
      placeholder: "mylogin@myserver",
      hint: "Often user@servername for SQL authentication.",
    },
    database: { placeholder: "mydatabase" },
  },
  oracle: {
    database: {
      label: "Service name or SID",
      hint: "Used in the connection descriptor (e.g. ORCL).",
      placeholder: "ORCL",
    },
  },
  db2: {
    host: { placeholder: "hostname or IP address" },
  },
  as400: {
    host: {
      label: "System name",
      placeholder: "MY_SYSTEM_NAME",
      hint: "System / Data Source name from IBM i Access / Operations Navigator.",
    },
    database: {
      label: "Library / default collection",
      placeholder: "MY_LIBRARY",
      hint: "Used as Default Collection for OLE DB (optional).",
    },
  },
  mysql: {
    host: { placeholder: "localhost" },
  },
  mariadb: {
    host: { placeholder: "localhost" },
  },
  postgresql: {
    host: { placeholder: "localhost" },
  },
  sqlite: {
    database: {
      label: "Database file path",
      placeholder: "C:\\data\\mydb.db or /var/data/mydb.db",
    },
  },
  redshift: {
    host: {
      label: "Cluster endpoint",
      placeholder: "example.123456789012.us-east-1.redshift.amazonaws.com",
    },
    database: { placeholder: "dev" },
  },
  firebird: {
    host: { label: "Data source", placeholder: "localhost" },
    database: {
      label: "Database file",
      placeholder: "C:\\database\\myData.fdb",
      hint: "Local path or remote file when a host is set.",
    },
  },
  teradata: {
    host: { label: "Data source / DBC name", placeholder: "myserver" },
    database: { hint: "Optional for ODBC/ADO.NET." },
  },
};

/**
 * @param {DatabaseId} db
 * @returns {FieldDef[]}
 */
export function getFieldsForDatabase(db) {
  const overrides = FIELD_OVERRIDES[db] ?? {};
  return SHARED_FIELDS.map((field) => ({
    ...field,
    ...overrides[field.id],
  }));
}

/**
 * Field ids that must be non-empty for the current connection mode.
 *
 * @param {{
 *   db: DatabaseId,
 *   format: import("./types.js").ConnectionFormat,
 *   useDsn: boolean,
 *   sqliteInMemory: boolean,
 *   db2ConnectMode: "hostname" | "dbalias",
 * }} ctx
 * @returns {string[]}
 */
export function getRequiredFieldIds(ctx) {
  /** @type {string[]} */
  const ids = [];

  if (ctx.useDsn) {
    ids.push("dsn");
    return ids;
  }

  if (ctx.format !== "adonet") {
    ids.push("driver");
  }

  if (ctx.db === "sqlite") {
    if (!ctx.sqliteInMemory) ids.push("database");
    return ids;
  }

  if (ctx.db === "db2" && ctx.db2ConnectMode === "dbalias") {
    ids.push("dbAlias");
    return ids;
  }

  if (ctx.db === "firebird") {
    ids.push("database");
    return ids;
  }

  if (ctx.db === "as400") {
    ids.push("host");
    return ids;
  }

  ids.push("host", "port");

  if (ctx.db === "teradata") {
    if (ctx.format === "oledb") ids.push("database");
  } else {
    ids.push("database");
  }

  return ids;
}
