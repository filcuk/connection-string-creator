import { initShell } from "./shell/shell.js";
import { initDropdown } from "./components/dropdown.js";
import { initToggleButton } from "./components/toggle-button.js";
import { initSegmentedControl } from "./components/segmented-control.js";
import { initDurationInput, parseDurationValue } from "./components/duration-input.js";
import { initCombobox } from "./components/combobox.js";
import { initAboutDialog } from "./components/about-dialog.js";
import { initDialog } from "./components/dialog.js";
import { initPopover } from "./components/popover.js";
import { initTutorial } from "./components/tutorial.js";
import { initIcons } from "./utils/icons.js";
import { setHidden } from "./utils/dom.js";
import { copyText } from "./utils/clipboard.js";
import {
  flashButtonLabel,
  prepareButtonLabelFlash,
  setButtonLabelFlash,
} from "./utils/button-label.js";
import {
  buildConnectionString,
  DATABASES,
  DATABASE_IDS,
  DRIVER_PRESETS,
  encryptDefaultOn,
  FORMAT_LABELS,
  getDefaultDriver,
  getDefaultPort,
  getDriverPresets,
  getFieldsForDatabase,
  getRequiredFieldIds,
  isSupported,
} from "./connection-string/index.js";

initShell();

const ABOUT_HINT_STORAGE_KEY = "connection-string-generator-about-hint-seen";
/** Persisted form inputs (never includes password). */
const FORM_STORAGE_KEY = "connection-string-generator-form";
/**
 * Skip localStorage writes until boot finishes, and while resetting / restoring.
 * (Component inits can emit onChange → updateOutput before restore runs.)
 */
let persistReady = false;
const aboutOpenBtn = document.getElementById("about-open-btn");

/** @type {ReturnType<typeof initPopover> | null} */
let aboutHintPopover = null;

function hasSeenAboutHint() {
  try {
    return localStorage.getItem(ABOUT_HINT_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markAboutHintSeen() {
  try {
    localStorage.setItem(ABOUT_HINT_STORAGE_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

function dismissAboutHint() {
  if (!aboutHintPopover) return;
  const popover = aboutHintPopover;
  aboutHintPopover = null;
  markAboutHintSeen();
  popover.destroy();
}

const overviewTour = initTutorial({
  id: "connection-string-overview",
  steps: [
    {
      target: "#conn-toolbar",
      title: "Configuration",
      body: "Choose the database engine and the API style.",
      position: "bottom",
    },
    {
      target: "#conn-form",
      title: "Connection details",
      body: "Enter host, credentials, driver, and options. Required empty fields are marked; unused options stay hidden.",
      position: "top",
    },
    {
      target: ".conn-output-wrap",
      title: "Generated string",
      body: "The connection string updates as you type. Use Copy when you are ready to paste it into your app or config.",
      position: "top",
    },
  ],
});

const aboutDialog = initAboutDialog({
  dialogEl: document.getElementById("about-dialog"),
  openTriggers: [aboutOpenBtn],
  onOpen: () => dismissAboutHint(),
});

document.getElementById("about-guided-tour")?.addEventListener("click", (event) => {
  event.preventDefault();
  dismissAboutHint();
  aboutDialog?.closeDialog();
  overviewTour?.start();
});

if (aboutOpenBtn instanceof HTMLElement && !hasSeenAboutHint()) {
  aboutHintPopover = initPopover({
    anchor: aboutOpenBtn,
    body: "Check here for more info and a guided tour!",
    position: "right",
    dismissible: false,
    trapFocus: false,
    actions: [
      {
        label: "Got it",
        className: "btn btn-primary",
        closeOnClick: false,
        onClick: () => dismissAboutHint(),
      },
    ],
    onClose: () => {
      if (!aboutHintPopover) return;
      const popover = aboutHintPopover;
      aboutHintPopover = null;
      markAboutHintSeen();
      queueMicrotask(() => popover.destroy());
    },
  });
  window.requestAnimationFrame(() => {
    aboutHintPopover?.open();
  });
}

/** @type {import("./connection-string/types.js").DatabaseId} */
let currentDb = "mssql";
/** @type {import("./connection-string/types.js").ConnectionFormat} */
let currentFormat = "odbc";
/** @type {"sql" | "windows"} */
let currentAuthMode = "sql";

const CUSTOM_DRIVER_LABEL = "Custom…";

const dbDropdownLabel = document.getElementById("db-dropdown-label");
const dbDropdownMenu = document.getElementById("db-dropdown-menu");
const authToggleEl = document.getElementById("auth-toggle");
const driverDropdownLabel = document.getElementById("driver-dropdown-label");
const driverDropdownMenu = document.getElementById("driver-dropdown-menu");
const formatToggleEl = document.getElementById("driver-toggle");
const outputEl = document.getElementById("conn-output");
const copyBtn = document.getElementById("conn-copy");
const resetBtn = document.getElementById("conn-reset");
const resetConfirmBtn = document.getElementById("conn-reset-confirm");
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
  encrypt: document.getElementById("conn-encrypt"),
  oracleMode: document.getElementById("conn-oracle-mode"),
  osAuth: document.getElementById("conn-os-auth"),
  db2Mode: document.getElementById("conn-db2-mode"),
  dbAlias: document.getElementById("conn-db-alias"),
  schema: document.getElementById("conn-schema"),
  packageCollection: document.getElementById("conn-package-collection"),
  sqliteMemory: document.getElementById("conn-sqlite-memory"),
};

const sqliteVersionToggleEl = document.getElementById("sqlite-version-toggle");
const sslToggleEl = document.getElementById("ssl-toggle");
const charsetInputEl = document.getElementById("conn-charset");
const charsetComboboxEl = document.getElementById("charset-combobox");
const timeoutDurationEl = document.getElementById("conn-timeout");

/** @type {ReturnType<typeof initCombobox> | null} */
let charsetCombobox = null;
/** @type {ReturnType<typeof initDurationInput> | null} */
let timeoutDuration = null;

const hostFieldEl = document.querySelector('label[for="conn-host"]');
const portFieldEl = document.querySelector('label[for="conn-port"]');
const databaseFieldEl = document.querySelector('label[for="conn-database"]');
const serverRowEl = document.querySelector(".conn-server-row");

const CUSTOM_DRIVER_VALUE = "__custom__";
/** Selected driver preset value, or `CUSTOM_DRIVER_VALUE`. */
let currentDriverValue = "";
/** Full connection string (unmasked) — used for copy. */
let connectionStringForCopy = "";
/** @type {ReturnType<typeof initToggleButton> | null} */
let passwordToggleBtn = null;
/** @type {ReturnType<typeof initSegmentedControl> | null} */
let formatToggle = null;
/** @type {ReturnType<typeof initSegmentedControl> | null} */
let authToggle = null;
/** @type {ReturnType<typeof initSegmentedControl> | null} */
let sqliteVersionToggle = null;
/** @type {ReturnType<typeof initSegmentedControl> | null} */
let sslToggle = null;

/** Convert duration control (H:MM:SS) to timeout seconds for builders; omit when zero. */
function readConnectionTimeout() {
  const hidden = document.querySelector("#conn-timeout .duration-input-value");
  const parts = parseDurationValue(hidden?.value, { showSeconds: true });
  if (parts) {
    const total = parts.hours * 3600 + parts.minutes * 60 + parts.seconds;
    return total > 0 ? String(total) : "";
  }
  const seconds = timeoutDuration?.getSeconds() ?? 0;
  return seconds > 0 ? String(seconds) : "";
}

function driverPresetLabel(preset) {
  return preset.label ?? preset.value;
}

function allDriverMeasureLabels() {
  const labels = new Set([CUSTOM_DRIVER_LABEL]);
  for (const byFormat of Object.values(DRIVER_PRESETS)) {
    for (const presets of Object.values(byFormat)) {
      for (const preset of presets) {
        labels.add(driverPresetLabel(preset));
      }
    }
  }
  return [...labels];
}

function setDriverSelection(value, label, { showCustom = false } = {}) {
  currentDriverValue = value;
  driverDropdownLabel.textContent = label;
  setHidden(driverCustomEl, !showCustom);
  driverCustomEl.hidden = !showCustom;
}

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

  if (!formats.includes(currentFormat)) {
    currentFormat = formats[0];
  }

  formatToggle = null;
  formatToggleEl.replaceChildren();

  if (formats.length <= 1) {
    setHidden(formatToggleEl, true);
    return;
  }

  setHidden(formatToggleEl, false);

  const list = document.createElement("div");
  list.className = "segmented-control-list";
  list.setAttribute("role", "radiogroup");
  list.setAttribute("aria-label", "Connection format");

  for (const format of formats) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "segmented-control-item";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(format === currentFormat));
    button.dataset.segmentedControlValue = format;
    button.textContent = FORMAT_LABELS[format];
    list.append(button);
  }

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.className = "segmented-control-value";
  hidden.name = "connection-format";
  hidden.value = currentFormat;

  formatToggleEl.append(list, hidden);
  formatToggleEl.dataset.segmentedControlDefault = currentFormat;

  formatToggle = initSegmentedControl(formatToggleEl, {
    defaultValue: currentFormat,
    onChange: ({ value, source }) => {
      if (source === "init") return;
      if (value && value !== currentFormat) {
        applyFormatChange(/** @type {import("./connection-string/types.js").ConnectionFormat} */ (value));
      }
    },
  });
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

  if (hideDriver) {
    currentDriverValue = "";
    return;
  }

  driverDropdownMenu.replaceChildren(
    ...presets.map((preset) => {
      const item = document.createElement("li");
      item.setAttribute("role", "none");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dropdown-menu-item";
      button.role = "menuitem";
      button.dataset.value = preset.value;
      button.textContent = driverPresetLabel(preset);
      item.append(button);
      return item;
    }),
    (() => {
      const item = document.createElement("li");
      item.setAttribute("role", "none");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dropdown-menu-item";
      button.role = "menuitem";
      button.dataset.value = CUSTOM_DRIVER_VALUE;
      button.textContent = CUSTOM_DRIVER_LABEL;
      item.append(button);
      return item;
    })()
  );

  const defaultDriver = getDefaultDriver(currentDb, currentFormat);
  const defaultPreset = presets.find((preset) => preset.value === defaultDriver);
  driverCustomEl.value = defaultDriver;
  setDriverSelection(defaultDriver, defaultPreset ? driverPresetLabel(defaultPreset) : defaultDriver);
}

function readFormValues() {
  const useCustomDriver = currentDriverValue === CUSTOM_DRIVER_VALUE;
  const driverName = useCustomDriver ? driverCustomEl.value.trim() : currentDriverValue;

  return {
    host: fieldInputs.host.value.trim(),
    port: fieldInputs.port.value.trim(),
    database: fieldInputs.database.value.trim(),
    username: fieldInputs.username.value.trim(),
    password: fieldInputs.password.value,
    driverName,
    authMode: currentAuthMode,
    osAuth: advancedInputs.osAuth.checked,
    encrypt: advancedInputs.encrypt.checked,
    connectionTimeout: readConnectionTimeout(),
    useDsn: advancedInputs.useDsn.checked && currentFormat === "odbc",
    dsn: advancedInputs.dsn.value.trim(),
    schema: advancedInputs.schema.value.trim(),
    db2ConnectMode: /** @type {"hostname" | "dbalias"} */ (advancedInputs.db2Mode.value),
    dbAlias: advancedInputs.dbAlias.value.trim(),
    oracleConnectMode: /** @type {"easyconnect" | "tns"} */ (advancedInputs.oracleMode.value),
    packageCollection: advancedInputs.packageCollection.value.trim(),
    sslMode: /** @type {"off" | "preferred" | "required"} */ (sslToggle?.getValue() || "off"),
    charset: charsetInputEl?.value.trim() || charsetCombobox?.getValue()?.trim() || "",
    sqliteInMemory: advancedInputs.sqliteMemory.checked,
    sqliteVersion: /** @type {"2" | "3"} */ (sqliteVersionToggle?.getValue() || "3"),
  };
}

function updateFieldVisibility() {
  const useDsn = advancedInputs.useDsn.checked && currentFormat === "odbc";
  const db2Alias = currentDb === "db2" && advancedInputs.db2Mode.value === "dbalias";
  const sqliteMemory = currentDb === "sqlite" && advancedInputs.sqliteMemory.checked;
  const hideCredentials =
    (currentDb === "mssql" && currentAuthMode === "windows") ||
    (currentDb === "oracle" && advancedInputs.osAuth.checked);

  setHidden(hostFieldEl, useDsn || db2Alias || currentDb === "sqlite" || sqliteMemory);
  setHidden(
    portFieldEl,
    useDsn || db2Alias || currentDb === "sqlite" || sqliteMemory || currentDb === "as400"
  );
  setHidden(
    databaseFieldEl,
    useDsn ||
      db2Alias ||
      sqliteMemory ||
      (currentDb === "as400" && currentFormat !== "oledb")
  );
  setHidden(
    serverRowEl,
    Boolean(
      hostFieldEl?.hasAttribute("hidden") &&
        portFieldEl?.hasAttribute("hidden") &&
        databaseFieldEl?.hasAttribute("hidden")
    )
  );
  setHidden(driverFieldEl, useDsn || currentFormat === "adonet");
  setHidden(usernameFieldEl, hideCredentials || currentDb === "sqlite");
  setHidden(passwordFieldEl, hideCredentials);

  const showUseDsn = currentFormat === "odbc" && !sqliteMemory;
  const showSqliteMemory = currentDb === "sqlite" && !useDsn;
  setHidden(document.querySelector(".conn-opt-dsn"), !showUseDsn);
  setHidden(document.querySelector(".conn-opt-sqlite-memory"), !showSqliteMemory);
  setHidden(document.querySelector(".conn-dsn-name"), !useDsn);
  setHidden(
    document.querySelector(".conn-source-row"),
    !showUseDsn && !showSqliteMemory && !useDsn
  );

  setHidden(document.querySelector(".conn-opt-timeout"), useDsn);
  setHidden(document.querySelector(".conn-opt-mssql-auth"), currentDb !== "mssql");
  setHidden(
    document.querySelector(".conn-opt-mssql-encrypt"),
    useDsn ||
      (currentDb !== "mssql" && currentDb !== "azuresql" && !(currentDb === "as400" && currentFormat === "odbc"))
  );

  const encryptHeading = document.getElementById("conn-encrypt-heading");
  const encryptText = document.getElementById("conn-encrypt-text");
  if (currentDb === "as400") {
    if (encryptHeading) encryptHeading.textContent = "SSL";
    if (encryptText) encryptText.textContent = "Use SSL";
  } else {
    if (encryptHeading) encryptHeading.textContent = "Encrypt connection";
    if (encryptText) encryptText.textContent = "Use encrypted connection";
  }

  setHidden(
    document.querySelector(".conn-opt-oracle-mode"),
    useDsn || currentDb !== "oracle"
  );
  setHidden(
    document.querySelector(".conn-opt-oracle-os"),
    useDsn || currentDb !== "oracle"
  );

  setHidden(
    document.querySelector(".conn-opt-db2-mode"),
    useDsn || currentDb !== "db2" || currentFormat === "adonet"
  );
  setHidden(
    document.querySelector(".conn-opt-db-alias"),
    useDsn ||
      currentDb !== "db2" ||
      advancedInputs.db2Mode.value !== "dbalias" ||
      currentFormat === "adonet"
  );
  setHidden(document.querySelector(".conn-opt-schema"), useDsn || currentDb !== "db2");
  setHidden(
    document.querySelector(".conn-opt-package"),
    useDsn || currentDb !== "db2" || currentFormat !== "oledb"
  );

  const showSsl = ["mysql", "mariadb", "redshift", "postgresql"].includes(currentDb);
  setHidden(document.querySelector(".conn-opt-ssl"), useDsn || !showSsl);
  setHidden(
    document.querySelector(".conn-opt-charset"),
    useDsn ||
      (currentDb !== "mysql" && currentDb !== "mariadb") ||
      currentFormat !== "odbc"
  );

  setHidden(
    document.querySelector(".conn-opt-sqlite-version"),
    useDsn || currentDb !== "sqlite" || currentFormat !== "adonet"
  );

  syncFormSections();
  syncSchemaFieldWidth();
  syncRequiredFields();
}

/**
 * Mark required controls and flag empty ones as invalid (red border).
 */
function syncRequiredFields() {
  const useDsn = advancedInputs.useDsn.checked && currentFormat === "odbc";
  const required = new Set(
    getRequiredFieldIds({
      db: currentDb,
      format: currentFormat,
      useDsn,
      sqliteInMemory: currentDb === "sqlite" && advancedInputs.sqliteMemory.checked,
      db2ConnectMode: /** @type {"hostname" | "dbalias"} */ (advancedInputs.db2Mode.value),
    })
  );

  /** @type {Record<string, { control: HTMLElement | null, value: string, field?: Element | null }>} */
  const targets = {
    host: {
      control: fieldInputs.host,
      value: fieldInputs.host?.value.trim() ?? "",
      field: hostFieldEl,
    },
    port: {
      control: fieldInputs.port,
      value: fieldInputs.port?.value.trim() ?? "",
      field: portFieldEl,
    },
    database: {
      control: fieldInputs.database,
      value: fieldInputs.database?.value.trim() ?? "",
      field: databaseFieldEl,
    },
    dsn: {
      control: advancedInputs.dsn,
      value: advancedInputs.dsn?.value.trim() ?? "",
      field: document.querySelector(".conn-dsn-name"),
    },
    dbAlias: {
      control: advancedInputs.dbAlias,
      value: advancedInputs.dbAlias?.value.trim() ?? "",
      field: document.querySelector(".conn-opt-db-alias"),
    },
    driver: {
      control:
        currentDriverValue === CUSTOM_DRIVER_VALUE
          ? driverCustomEl
          : document.getElementById("driver-dropdown-trigger"),
      value:
        currentDriverValue === CUSTOM_DRIVER_VALUE
          ? driverCustomEl?.value.trim() ?? ""
          : currentDriverValue.trim(),
      field: driverFieldEl,
    },
  };

  for (const [id, target] of Object.entries(targets)) {
    const isRequired = required.has(id);
    const control = target.control;
    const field = target.field;
    const empty = !target.value;

    field?.classList.toggle("is-required", isRequired);
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      control.toggleAttribute("required", isRequired);
      if (isRequired && empty) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
    } else if (control instanceof HTMLElement) {
      // Dropdown trigger (driver presets)
      if (isRequired && empty) control.setAttribute("aria-invalid", "true");
      else control.removeAttribute("aria-invalid");
    }
  }
}

/** Keep DB2 schema input the same width as the database field input. */
let lastDatabaseInputWidth = 0;

function syncSchemaFieldWidth() {
  const schemaInput = document.querySelector(".conn-opt-schema .input");
  if (!(schemaInput instanceof HTMLElement)) return;

  const databaseInput = fieldInputs.database;
  if (databaseInput instanceof HTMLElement && databaseInput.offsetWidth > 0) {
    lastDatabaseInputWidth = databaseInput.offsetWidth;
  }

  if (lastDatabaseInputWidth > 0) {
    schemaInput.style.width = `${lastDatabaseInputWidth}px`;
    schemaInput.style.maxWidth = "100%";
  }
}

function sectionHasVisibleFields(section) {
  return [...section.querySelectorAll(".field")].some(
    (field) => !field.hasAttribute("hidden")
  );
}

function syncFormSections() {
  const sections = [...document.querySelectorAll("#conn-form > .conn-form-section")];
  sections.forEach((section) => {
    setHidden(section, !sectionHasVisibleFields(section));
  });

  document.querySelectorAll("#conn-form > .panel-divider").forEach((divider) => {
    setHidden(divider, true);
  });

  const visible = sections.filter((section) => !section.hasAttribute("hidden"));
  for (let i = 0; i < visible.length - 1; i++) {
    let el = visible[i].nextElementSibling;
    while (el && el !== visible[i + 1]) {
      if (el.classList.contains("panel-divider")) {
        setHidden(el, false);
        break;
      }
      el = el.nextElementSibling;
    }
  }
}

function isPasswordHidden() {
  return passwordInput.type === "password";
}

function maskPassword(value) {
  return "•".repeat(value.length);
}

/**
 * Snapshot of form state safe to keep in localStorage.
 * Password is never included — do not add it here.
 * @returns {Record<string, unknown>}
 */
function collectPersistableState() {
  const values = readFormValues();
  return {
    db: currentDb,
    format: currentFormat,
    authMode: currentAuthMode,
    host: values.host,
    port: values.port,
    database: values.database,
    username: values.username,
    driverValue: currentDriverValue,
    driverCustom: driverCustomEl.value,
    useDsn: advancedInputs.useDsn.checked,
    dsn: values.dsn,
    encrypt: values.encrypt,
    connectionTimeout: values.connectionTimeout,
    osAuth: values.osAuth,
    oracleConnectMode: values.oracleConnectMode,
    db2ConnectMode: values.db2ConnectMode,
    dbAlias: values.dbAlias,
    schema: values.schema,
    packageCollection: values.packageCollection,
    sslMode: values.sslMode,
    charset: values.charset,
    sqliteInMemory: values.sqliteInMemory,
    sqliteVersion: values.sqliteVersion,
  };
}

function savePersistedForm() {
  if (!persistReady) return;
  try {
    const state = collectPersistableState();
    // Hard guarantee: never write a password key, even if added by mistake later.
    delete state.password;
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @returns {Record<string, unknown> | null}
 */
function loadPersistedForm() {
  try {
    const raw = localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || typeof state !== "object" || Array.isArray(state)) return null;
    // Discard any password that should never have been stored.
    delete state.password;
    return state;
  } catch {
    return null;
  }
}

/**
 * Apply saved inputs. Password is always left empty.
 * @param {Record<string, unknown>} state
 * @returns {boolean}
 */
function applyPersistedForm(state) {
  const db = state.db;
  if (typeof db !== "string" || !DATABASE_IDS.includes(/** @type {import("./connection-string/types.js").DatabaseId} */ (db))) {
    return false;
  }

  currentDb = /** @type {import("./connection-string/types.js").DatabaseId} */ (db);
  dbDropdownLabel.textContent = DATABASES[currentDb].label;

  const formats = DATABASES[currentDb].drivers;
  const format = state.format;
  currentFormat =
    typeof format === "string" && formats.includes(/** @type {import("./connection-string/types.js").ConnectionFormat} */ (format))
      ? /** @type {import("./connection-string/types.js").ConnectionFormat} */ (format)
      : formats[0];

  renderFormatToggle();
  updateFieldLabels();

  fieldInputs.host.value = typeof state.host === "string" ? state.host : "";
  fieldInputs.port.value =
    typeof state.port === "string" && state.port
      ? state.port
      : getDefaultPort(currentDb);
  fieldInputs.database.value = typeof state.database === "string" ? state.database : "";
  fieldInputs.username.value = typeof state.username === "string" ? state.username : "";
  fieldInputs.password.value = "";
  clearPasswordField();

  currentAuthMode = state.authMode === "windows" ? "windows" : "sql";
  authToggle?.selectValue(currentAuthMode, { emit: false });

  advancedInputs.useDsn.checked = Boolean(state.useDsn) && currentFormat === "odbc";
  advancedInputs.dsn.value = typeof state.dsn === "string" ? state.dsn : "";
  advancedInputs.encrypt.checked = Boolean(state.encrypt);
  advancedInputs.oracleMode.value =
    state.oracleConnectMode === "tns" ? "tns" : "easyconnect";
  advancedInputs.osAuth.checked = Boolean(state.osAuth);
  advancedInputs.db2Mode.value =
    state.db2ConnectMode === "dbalias" ? "dbalias" : "hostname";
  advancedInputs.dbAlias.value = typeof state.dbAlias === "string" ? state.dbAlias : "";
  advancedInputs.schema.value = typeof state.schema === "string" ? state.schema : "";
  advancedInputs.packageCollection.value =
    typeof state.packageCollection === "string" ? state.packageCollection : "";
  advancedInputs.sqliteMemory.checked = Boolean(state.sqliteInMemory);

  const timeoutSeconds =
    typeof state.connectionTimeout === "string" && state.connectionTimeout
      ? Number(state.connectionTimeout)
      : 0;
  timeoutDuration?.setSeconds(Number.isFinite(timeoutSeconds) ? timeoutSeconds : 0);

  const sslMode =
    state.sslMode === "preferred" || state.sslMode === "required" ? state.sslMode : "off";
  sslToggle?.selectValue(sslMode, { emit: false });

  charsetCombobox?.setValue(typeof state.charset === "string" ? state.charset : "");

  const sqliteVersion = state.sqliteVersion === "2" ? "2" : "3";
  sqliteVersionToggle?.selectValue(sqliteVersion, { emit: false });

  renderDriverPresets();

  const driverValue = typeof state.driverValue === "string" ? state.driverValue : "";
  const driverCustom = typeof state.driverCustom === "string" ? state.driverCustom : "";
  if (currentFormat === "adonet") {
    currentDriverValue = "";
  } else if (driverValue === CUSTOM_DRIVER_VALUE) {
    driverCustomEl.value = driverCustom || getDefaultDriver(currentDb, currentFormat);
    setDriverSelection(CUSTOM_DRIVER_VALUE, CUSTOM_DRIVER_LABEL, { showCustom: true });
  } else if (driverValue) {
    const presets = getDriverPresets(currentDb, currentFormat);
    const preset = presets.find((entry) => entry.value === driverValue);
    if (preset) {
      setDriverSelection(preset.value, driverPresetLabel(preset));
    } else {
      driverCustomEl.value = driverValue;
      setDriverSelection(CUSTOM_DRIVER_VALUE, CUSTOM_DRIVER_LABEL, { showCustom: true });
    }
  }

  updateOutput();
  return true;
}

function updateOutput() {
  updateFieldVisibility();

  if (!isSupported(currentDb, currentFormat)) {
    connectionStringForCopy = "";
    outputEl.value = "";
    syncCopyButtonState();
    syncResetButtonState();
    savePersistedForm();
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
  syncCopyButtonState();
  syncResetButtonState();
  savePersistedForm();
}

function syncCopyButtonState() {
  copyBtn.disabled = !connectionStringForCopy;
}

/** True when configuration and fields match the post-reset defaults. */
function isFormBlank() {
  const values = readFormValues();
  const defaultDriver = getDefaultDriver("mssql", "odbc");

  if (currentDb !== "mssql" || currentFormat !== "odbc") return false;
  if (currentAuthMode !== "sql") return false;
  if (values.host || values.database || values.username || values.password) return false;
  if (values.port !== getDefaultPort("mssql")) return false;
  if (currentDriverValue === CUSTOM_DRIVER_VALUE) return false;
  if (currentDriverValue !== defaultDriver) return false;
  if (values.useDsn || values.dsn) return false;
  if (values.encrypt || values.osAuth || values.sqliteInMemory) return false;
  if (values.connectionTimeout) return false;
  if (values.dbAlias || values.schema || values.packageCollection || values.charset) return false;
  if (values.sslMode !== "off") return false;
  if (values.sqliteVersion !== "3") return false;
  if (values.oracleConnectMode !== "easyconnect") return false;
  if (values.db2ConnectMode !== "hostname") return false;
  return true;
}

function syncResetButtonState() {
  if (!(resetBtn instanceof HTMLButtonElement)) return;
  resetBtn.disabled = isFormBlank();
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
  if (format !== "odbc") {
    advancedInputs.useDsn.checked = false;
  }
  renderDriverPresets();
  updateOutput();
}

async function copyOutput() {
  const text = connectionStringForCopy;
  if (!text) return;

  const copied = await copyText(text);
  flashButtonLabel(copyBtn, copied, {
    reset: () => {
      copyBtn.setAttribute("aria-label", "Copy");
      setButtonLabelFlash(copyBtn, "Copy");
    },
  });
}

function applyPasswordVisibility(pressed) {
  passwordInput.type = pressed ? "text" : "password";
  updateOutput();
}

/** Clear password and hide it without triggering a persist cycle. */
function clearPasswordField() {
  if (passwordInput) passwordInput.value = "";
  passwordToggleBtn?.setPressed(false, { emit: false });
  if (passwordInput) passwordInput.type = "password";
}

/** Reset all configuration and connection fields to defaults. */
function resetConnectionForm() {
  currentDb = "mssql";
  currentFormat = "odbc";
  dbDropdownLabel.textContent = DATABASES.mssql.label;

  for (const input of Object.values(fieldInputs)) {
    if (input) input.value = "";
  }
  clearPasswordField();

  currentDriverValue = "";
  driverDropdownLabel.textContent = "";
  driverCustomEl.value = "";
  setHidden(driverCustomEl, true);
  driverCustomEl.hidden = true;

  advancedInputs.useDsn.checked = false;
  advancedInputs.dsn.value = "";
  timeoutDuration?.setSeconds(0);
  currentAuthMode = "sql";
  authToggle?.selectValue("sql", { emit: false });
  advancedInputs.encrypt.checked = false;
  advancedInputs.oracleMode.value = "easyconnect";
  advancedInputs.osAuth.checked = false;
  advancedInputs.db2Mode.value = "hostname";
  advancedInputs.dbAlias.value = "";
  advancedInputs.schema.value = "";
  advancedInputs.packageCollection.value = "";
  advancedInputs.sqliteMemory.checked = false;
  charsetCombobox?.setValue("");
  sslToggle?.selectValue("off", { emit: false });
  sqliteVersionToggle?.selectValue("3", { emit: false });

  renderFormatToggle();
  updateFieldLabels();
  fieldInputs.port.value = getDefaultPort(currentDb);
  renderDriverPresets();
  updateFieldVisibility();
  updateOutput();
}

function bootConnectionForm() {
  // Snapshot storage before hydrate; saves stay disabled until hydrate finishes
  // so init-time onChange (e.g. password toggle) cannot overwrite it.
  const saved = loadPersistedForm();

  const hydrate = () => {
    persistReady = false;
    resetConnectionForm();
    if (saved) applyPersistedForm(saved);
    clearPasswordField();
    updateOutput();
    persistReady = true;
    savePersistedForm();
  };

  hydrate();
  // Browsers may restore form controls after the first paint (reload / bfcache).
  requestAnimationFrame(() => {
    requestAnimationFrame(hydrate);
  });
}

buildDbMenu();

const dbDropdownTrigger = document.getElementById("db-dropdown-trigger");
prepareButtonLabelFlash(dbDropdownTrigger, {
  idle: DATABASES.mssql.label,
  measureLabels: DATABASE_IDS.map((id) => DATABASES[id].label),
});

initDropdown(document.getElementById("db-dropdown"), {
  onSelect: ({ value }) => {
    if (value && value !== currentDb) {
      applyDatabaseChange(/** @type {import("./connection-string/types.js").DatabaseId} */ (value), {
        resetPort: true,
      });
    }
  },
});

authToggle = initSegmentedControl(authToggleEl, {
  defaultValue: "sql",
  onChange: ({ value, source }) => {
    if (source === "init") return;
    if (!value || value === currentAuthMode) return;
    currentAuthMode = /** @type {"sql" | "windows"} */ (value);
    updateOutput();
  },
});

charsetCombobox = initCombobox(charsetComboboxEl, {
  allowCustom: true,
  onChange: () => {
    updateOutput();
  },
});

timeoutDuration = initDurationInput(timeoutDurationEl, {
  onChange: ({ source }) => {
    if (source === "init") return;
    updateOutput();
  },
  onInput: () => {
    updateOutput();
  },
});

sqliteVersionToggle = initSegmentedControl(sqliteVersionToggleEl, {
  defaultValue: "3",
  onChange: ({ source }) => {
    if (source === "init") return;
    updateOutput();
  },
});

sslToggle = initSegmentedControl(sslToggleEl, {
  defaultValue: "off",
  onChange: ({ source }) => {
    if (source === "init") return;
    updateOutput();
  },
});

const driverDropdownTrigger = document.getElementById("driver-dropdown-trigger");
prepareButtonLabelFlash(driverDropdownTrigger, {
  idle: getDefaultDriver("mssql", "odbc"),
  measureLabels: allDriverMeasureLabels(),
});

initDropdown(document.getElementById("driver-dropdown"), {
  onSelect: ({ value, label }) => {
    if (!value) return;
    const isCustom = value === CUSTOM_DRIVER_VALUE;
    if (isCustom && !driverCustomEl.value) {
      driverCustomEl.value = getDefaultDriver(currentDb, currentFormat);
    }
    setDriverSelection(value, label || CUSTOM_DRIVER_LABEL, { showCustom: isCustom });
    updateOutput();
  },
});

passwordToggleBtn = initToggleButton(passwordToggle, {
  alwaysActive: true,
  iconOff: "visibility",
  iconOn: "visibility-off",
  ariaLabelOff: "Show password",
  ariaLabelOn: "Hide password",
  iconClass: "btn-icon-svg",
  onChange: ({ pressed, source }) => {
    if (source === "init") return;
    applyPasswordVisibility(pressed);
  },
});

driverCustomEl.addEventListener("input", updateOutput);

document.getElementById("conn-app").addEventListener("input", (event) => {
  if (event.target === driverCustomEl) return;
  updateOutput();
});

document.getElementById("conn-app").addEventListener("change", (event) => {
  if (event.target === advancedInputs.useDsn && advancedInputs.useDsn.checked) {
    advancedInputs.sqliteMemory.checked = false;
  }
  if (event.target === advancedInputs.sqliteMemory && advancedInputs.sqliteMemory.checked) {
    advancedInputs.useDsn.checked = false;
  }
  if (
    event.target === advancedInputs.useDsn ||
    event.target === advancedInputs.encrypt ||
    event.target === advancedInputs.osAuth ||
    event.target === advancedInputs.db2Mode ||
    event.target === advancedInputs.oracleMode ||
    event.target === advancedInputs.sqliteMemory
  ) {
    updateOutput();
  }
});

copyBtn.addEventListener("click", copyOutput);

const resetDialog = initDialog({
  dialogEl: document.getElementById("reset-dialog"),
  openTriggers: [resetBtn],
});

resetConfirmBtn?.addEventListener("click", () => {
  resetConnectionForm();
  resetDialog?.closeDialog();
});

prepareButtonLabelFlash(copyBtn, {
  idle: "Copy",
  success: "Copied",
  fail: "Failed",
});

document.getElementById("conn-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
});

initIcons(document.getElementById("conn-app"));
bootConnectionForm();

window.addEventListener("resize", () => {
  syncSchemaFieldWidth();
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    bootConnectionForm();
  }
});
