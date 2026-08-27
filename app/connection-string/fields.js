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
