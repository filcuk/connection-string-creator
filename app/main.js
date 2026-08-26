import { initShell } from "./shell/shell.js";
import { initDropdown } from "./components/dropdown.js";
import { initExpand } from "./components/expand.js";
import { initIcons, mountIcon } from "./utils/icons.js";
import { setHidden } from "./utils/dom.js";
import {
  buildConnectionString,
  DATABASES,
  DATABASE_IDS,
  encryptDefaultOn,
  FORMAT_LABELS,
  getDefaultDriver,
  getDefaultPort,
  getDriverPresets,
  getFieldsForDatabase,
  isSupported,
} from "./connection-string/index.js";

initShell();

/** @type {import("./connection-string/types.js").DatabaseId} */
let currentDb = "mssql";
/** @type {import("./connection-string/types.js").ConnectionFormat} */
let currentFormat = "odbc";

const dbDropdownLabel = document.getElementById("db-dropdown-label");
const dbDropdownMenu = document.getElementById("db-dropdown-menu");
const formatToggleEl = document.getElementById("driver-toggle");
const outputEl = document.getElementById("conn-output");
const copyBtn = document.getElementById("conn-copy");
const copyLabel = document.getElementById("conn-copy-label");
const driverPresetEl = document.getElementById("conn-driver-preset");
const driverCustomEl = document.getElementById("conn-driver-custom");
const driverLabelEl = document.getElementById("conn-driver-label");
const driverFieldEl = document.querySelector(".conn-driver-field");
const passwordInput = document.getElementById("conn-password");
const passwordFieldEl = document.querySelector(".conn-password-field");
const passwordToggle = document.getElementById("conn-password-toggle");
const usernameFieldEl = document.querySelector('label[for="conn-username"]');

/** @type {Record<string, HTMLInputElement>} */
const fieldInputs = {
  host: document.getElementById("conn-host"),
  port: document.getElementById("conn-port"),
  database: document.getElementById("conn-database"),
  username: document.getElementById("conn-username"),
  password: passwordInput,
};

const advancedInputs = {
  useDsn: document.getElementById("conn-use-dsn"),
  dsn: document.getElementById("conn-dsn"),
  timeout: document.getElementById("conn-timeout"),
  authMode: document.getElementById("conn-auth-mode"),
  encrypt: document.getElementById("conn-encrypt"),
  oracleMode: document.getElementById("conn-oracle-mode"),
  osAuth: document.getElementById("conn-os-auth"),
  db2Mode: document.getElementById("conn-db2-mode"),
  dbAlias: document.getElementById("conn-db-alias"),
  schema: document.getElementById("conn-schema"),
  packageCollection: document.getElementById("conn-package-collection"),
  sslMode: document.getElementById("conn-ssl-mode"),
  charset: document.getElementById("conn-charset"),
  sqliteMemory: document.getElementById("conn-sqlite-memory"),
  sqliteVersion: document.getElementById("conn-sqlite-version"),
};

const hostFieldEl = document.querySelector('label[for="conn-host"]');
const portFieldEl = document.querySelector('label[for="conn-port"]');
const databaseFieldEl = document.querySelector('label[for="conn-database"]');

const CUSTOM_DRIVER_VALUE = "__custom__";
let copyResetTimer = 0;
/** Full connection string (unmasked) — used for copy. */
let connectionStringForCopy = "";
/** @type {ReturnType<typeof initExpand> | null} */
let advancedExpand = null;

function buildDbMenu() {
  dbDropdownMenu.replaceChildren(
    ...DATABASE_IDS.map((id) => {
      const item = document.createElement("li");
      item.setAttribute("role", "none");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dropdown-menu-item";
      button.role = "menuitem";
      button.dataset.value = id;
      button.textContent = DATABASES[id].label;
      item.append(button);
      return item;
    })
  );
}

function renderFormatToggle() {
  const formats = DATABASES[currentDb].drivers;
  formatToggleEl.replaceChildren(
    ...formats.map((format) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn driver-toggle-btn";
      button.dataset.driver = format;
      button.textContent = FORMAT_LABELS[format];
      button.setAttribute("aria-pressed", String(format === currentFormat));
      return button;
    })
  );

  if (!formats.includes(currentFormat)) {
    currentFormat = formats[0];
  }

  setHidden(formatToggleEl, formats.length <= 1);
}

function updateFieldLabels() {
  const fields = getFieldsForDatabase(currentDb);
  for (const field of fields) {
    const labelEl = document.getElementById(`conn-${field.id}-label`);
    const hintEl = document.getElementById(`conn-${field.id}-hint`);
    const input = fieldInputs[field.id];

    if (labelEl) labelEl.textContent = field.label;
    if (input && field.placeholder) input.placeholder = field.placeholder;

    if (hintEl) {
      if (field.hint) {
        hintEl.textContent = field.hint;
        setHidden(hintEl, false);
      } else {
        hintEl.textContent = "";
        setHidden(hintEl, true);
      }
    }
  }
}

function renderDriverPresets() {
  const presets = getDriverPresets(currentDb, currentFormat);
  const isOledb = currentFormat === "oledb";
  const hideDriver = currentFormat === "adonet";

  driverLabelEl.textContent = isOledb ? "Provider" : "Driver";
  setHidden(driverFieldEl, hideDriver);

  if (hideDriver) return;

  driverPresetEl.replaceChildren(
    ...presets.map(({ value, label }) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label ?? value;
      return option;
    }),
    (() => {
      const option = document.createElement("option");
      option.value = CUSTOM_DRIVER_VALUE;
      option.textContent = "Custom…";
      return option;
    })()
  );

  const defaultDriver = getDefaultDriver(currentDb, currentFormat);
  driverPresetEl.value = defaultDriver;
  driverCustomEl.value = defaultDriver;
  setHidden(driverCustomEl, true);
  driverCustomEl.hidden = true;
}

function readFormValues() {
  const useCustomDriver = driverPresetEl.value === CUSTOM_DRIVER_VALUE;
  const driverName = useCustomDriver ? driverCustomEl.value.trim() : driverPresetEl.value;

  return {
    host: fieldInputs.host.value.trim(),
    port: fieldInputs.port.value.trim(),
    database: fieldInputs.database.value.trim(),
    username: fieldInputs.username.value.trim(),
    password: fieldInputs.password.value,
    driverName,
    authMode: /** @type {"sql" | "windows"} */ (advancedInputs.authMode.value),
    osAuth: advancedInputs.osAuth.checked,
    encrypt: advancedInputs.encrypt.checked,
    connectionTimeout: advancedInputs.timeout.value.trim(),
    useDsn: advancedInputs.useDsn.checked,
    dsn: advancedInputs.dsn.value.trim(),
    schema: advancedInputs.schema.value.trim(),
    db2ConnectMode: /** @type {"hostname" | "dbalias"} */ (advancedInputs.db2Mode.value),
    dbAlias: advancedInputs.dbAlias.value.trim(),
    oracleConnectMode: /** @type {"easyconnect" | "tns"} */ (advancedInputs.oracleMode.value),
    packageCollection: advancedInputs.packageCollection.value.trim(),
    sslMode: /** @type {"off" | "preferred" | "required"} */ (advancedInputs.sslMode.value),
    charset: advancedInputs.charset.value.trim(),
    sqliteInMemory: advancedInputs.sqliteMemory.checked,
    sqliteVersion: /** @type {"2" | "3"} */ (advancedInputs.sqliteVersion.value),
  };
}

function updateFieldVisibility() {
  const useDsn = advancedInputs.useDsn.checked && currentFormat === "odbc";
  const db2Alias = currentDb === "db2" && advancedInputs.db2Mode.value === "dbalias";
  const sqliteMemory = currentDb === "sqlite" && advancedInputs.sqliteMemory.checked;
  const hideCredentials =
    (currentDb === "mssql" && advancedInputs.authMode.value === "windows") ||
    (currentDb === "oracle" && advancedInputs.osAuth.checked);

  setHidden(hostFieldEl, useDsn || db2Alias || currentDb === "sqlite" || sqliteMemory);
  setHidden(portFieldEl, useDsn || db2Alias || currentDb === "sqlite" || sqliteMemory);
  setHidden(databaseFieldEl, useDsn || db2Alias || sqliteMemory);
  setHidden(driverFieldEl, useDsn || currentFormat === "adonet");
  setHidden(usernameFieldEl, hideCredentials || currentDb === "sqlite");
  setHidden(passwordFieldEl, hideCredentials);

  setHidden(document.querySelector(".conn-opt-dsn"), currentFormat !== "odbc");
  setHidden(document.querySelector(".conn-opt-dsn-name"), currentFormat !== "odbc" || !advancedInputs.useDsn.checked);

  setHidden(document.querySelector(".conn-opt-mssql-auth"), currentDb !== "mssql");
  setHidden(
    document.querySelector(".conn-opt-mssql-encrypt"),
    currentDb !== "mssql" && currentDb !== "azuresql"
  );

  setHidden(document.querySelector(".conn-opt-oracle-mode"), currentDb !== "oracle");
  setHidden(document.querySelector(".conn-opt-oracle-os"), currentDb !== "oracle");

  setHidden(
    document.querySelector(".conn-opt-db2-mode"),
    currentDb !== "db2" || currentFormat === "adonet"
  );
  setHidden(
    document.querySelector(".conn-opt-db-alias"),
    currentDb !== "db2" || advancedInputs.db2Mode.value !== "dbalias" || currentFormat === "adonet"
  );
  setHidden(document.querySelector(".conn-opt-schema"), currentDb !== "db2");
  setHidden(
    document.querySelector(".conn-opt-package"),
    currentDb !== "db2" || currentFormat !== "oledb"
  );

  const showSsl = ["mysql", "mariadb", "redshift", "postgresql"].includes(currentDb);
  setHidden(document.querySelector(".conn-opt-ssl"), !showSsl);
  setHidden(
    document.querySelector(".conn-opt-charset"),
    (currentDb !== "mysql" && currentDb !== "mariadb") || currentFormat !== "odbc"
  );

  setHidden(document.querySelector(".conn-opt-sqlite-memory"), currentDb !== "sqlite");
  setHidden(document.querySelector(".conn-opt-sqlite-version"), currentDb !== "sqlite" || currentFormat !== "adonet");
}

function isPasswordHidden() {
  return passwordInput.type === "password";
}

function maskPassword(value) {
  return "•".repeat(value.length);
}

function updateOutput() {
  updateFieldVisibility();

  if (!isSupported(currentDb, currentFormat)) {
    connectionStringForCopy = "";
    outputEl.value = "";
    return;
  }

  const values = readFormValues();
  connectionStringForCopy = buildConnectionString({
    db: currentDb,
    driver: currentFormat,
    values,
  });

  const displayValues =
    isPasswordHidden() && values.password
      ? { ...values, password: maskPassword(values.password) }
      : values;

  outputEl.value = buildConnectionString({
    db: currentDb,
    driver: currentFormat,
    values: displayValues,
  });
}

function applyDatabaseChange(db, { resetPort = true } = {}) {
  currentDb = db;
  dbDropdownLabel.textContent = DATABASES[db].label;

  renderFormatToggle();
  updateFieldLabels();

  if (resetPort) {
    const port = getDefaultPort(db);
    fieldInputs.port.value = port;
  }

  advancedInputs.encrypt.checked = encryptDefaultOn(db);
  if (db === "firebird" && !fieldInputs.username.value) {
    fieldInputs.username.value = "SYSDBA";
  }

  renderDriverPresets();
  updateOutput();
}

function applyFormatChange(format) {
  currentFormat = format;
  formatToggleEl.querySelectorAll(".driver-toggle-btn").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.driver === format));
  });
  if (format !== "odbc") {
    advancedInputs.useDsn.checked = false;
  }
  renderDriverPresets();
  updateOutput();
}

async function copyOutput() {
  const text = connectionStringForCopy;
  if (!text) return;

  let copied = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (!copied) {
    outputEl.value = text;
    outputEl.focus();
    outputEl.select();
    copied = document.execCommand("copy");
    updateOutput();
  }

  if (copied) {
    copyLabel.textContent = "Copied!";
    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      copyLabel.textContent = "Copy";
    }, 2000);
  }
}

function togglePasswordVisibility() {
  const visible = passwordInput.type === "password";
  passwordInput.type = visible ? "text" : "password";
  passwordToggle.setAttribute("aria-pressed", String(visible));
  passwordToggle.setAttribute("aria-label", visible ? "Hide password" : "Show password");
  mountIcon(passwordToggle, visible ? "visibility-off" : "visibility", {
    className: "btn-icon-svg",
  });
  updateOutput();
}

function resetPasswordVisibility() {
  passwordInput.type = "password";
  passwordToggle.setAttribute("aria-pressed", "false");
  passwordToggle.setAttribute("aria-label", "Show password");
  mountIcon(passwordToggle, "visibility", { className: "btn-icon-svg" });
}

/** Reset all configuration and connection fields to defaults (no persisted state). */
function resetConnectionForm() {
  currentDb = "mssql";
  currentFormat = "odbc";
  dbDropdownLabel.textContent = DATABASES.mssql.label;

  for (const input of Object.values(fieldInputs)) {
    input.value = "";
  }
  resetPasswordVisibility();

  driverCustomEl.value = "";
  setHidden(driverCustomEl, true);
  driverCustomEl.hidden = true;

  advancedInputs.useDsn.checked = false;
  advancedInputs.dsn.value = "";
  advancedInputs.timeout.value = "";
  advancedInputs.authMode.value = "sql";
  advancedInputs.encrypt.checked = false;
  advancedInputs.oracleMode.value = "easyconnect";
  advancedInputs.osAuth.checked = false;
  advancedInputs.db2Mode.value = "hostname";
  advancedInputs.dbAlias.value = "";
  advancedInputs.schema.value = "";
  advancedInputs.packageCollection.value = "";
  advancedInputs.sslMode.value = "off";
  advancedInputs.charset.value = "";
  advancedInputs.sqliteMemory.checked = false;
  advancedInputs.sqliteVersion.value = "3";

  advancedExpand?.close();

  renderFormatToggle();
  updateFieldLabels();
  fieldInputs.port.value = getDefaultPort(currentDb);
  renderDriverPresets();
  updateFieldVisibility();
  updateOutput();
}

function bootConnectionForm() {
  resetConnectionForm();
  // Browsers may restore form controls after the first paint (reload / bfcache).
  requestAnimationFrame(() => {
    resetConnectionForm();
  });
}

buildDbMenu();

initDropdown(document.getElementById("db-dropdown"), {
  onSelect: ({ value }) => {
    if (value && value !== currentDb) {
      applyDatabaseChange(/** @type {import("./connection-string/types.js").DatabaseId} */ (value), {
        resetPort: true,
      });
    }
  },
});

advancedExpand = initExpand(document.getElementById("conn-advanced"));

formatToggleEl.addEventListener("click", (event) => {
  const button = event.target.closest(".driver-toggle-btn");
  if (!button) return;
  const format = /** @type {import("./connection-string/types.js").ConnectionFormat} */ (
    button.dataset.driver
  );
  if (format && format !== currentFormat) {
    applyFormatChange(format);
  }
});

driverPresetEl.addEventListener("change", () => {
  const isCustom = driverPresetEl.value === CUSTOM_DRIVER_VALUE;
  setHidden(driverCustomEl, !isCustom);
  if (isCustom && !driverCustomEl.value) {
    driverCustomEl.value = getDefaultDriver(currentDb, currentFormat);
  }
  updateOutput();
});

driverCustomEl.addEventListener("input", updateOutput);

document.getElementById("conn-app").addEventListener("input", (event) => {
  if (event.target === driverCustomEl) return;
  updateOutput();
});

document.getElementById("conn-app").addEventListener("change", (event) => {
  if (
    event.target === advancedInputs.useDsn ||
    event.target === advancedInputs.authMode ||
    event.target === advancedInputs.encrypt ||
    event.target === advancedInputs.osAuth ||
    event.target === advancedInputs.db2Mode ||
    event.target === advancedInputs.oracleMode ||
    event.target === advancedInputs.sslMode ||
    event.target === advancedInputs.sqliteMemory ||
    event.target === advancedInputs.sqliteVersion
  ) {
    updateOutput();
  }
});

copyBtn.addEventListener("click", copyOutput);
passwordToggle.addEventListener("click", togglePasswordVisibility);

document.getElementById("conn-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
});

initIcons(document.getElementById("conn-app"));
bootConnectionForm();

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    bootConnectionForm();
  }
});
