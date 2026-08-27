/**
 * Golden-string tests for buildConnectionString.
 * Locks current output for every database × format × applicable scenario.
 *
 * Run: node --test app/connection-string/__tests__/build-connection-string.test.js
 * Regenerate goldens: node app/connection-string/__tests__/generate-goldens.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildConnectionString,
  DATABASE_IDS,
  DATABASES,
  isSupported,
} from "../index.js";
import { allCases } from "./fixtures.js";

const here = dirname(fileURLToPath(import.meta.url));
const goldensPath = join(here, "goldens.json");

/** @type {{ goldens: Record<string, string>, count: number }} */
const snapshot = JSON.parse(readFileSync(goldensPath, "utf8"));

describe("buildConnectionString goldens", () => {
  const cases = allCases();

  it("covers every supported database × format at least once", () => {
    const seen = new Set(cases.map((c) => `${c.db}/${c.format}`));
    for (const db of DATABASE_IDS) {
      for (const format of DATABASES[db].drivers) {
        assert.ok(
          seen.has(`${db}/${format}`),
          `missing cases for ${db}/${format}`
        );
      }
    }
  });

  it("goldens.json matches the current case matrix size", () => {
    assert.equal(Object.keys(snapshot.goldens).length, cases.length);
    assert.equal(snapshot.count, cases.length);
  });

  for (const { key, db, format, values } of cases) {
    it(key, () => {
      assert.ok(key in snapshot.goldens, `missing golden for ${key}`);
      const actual = buildConnectionString({ db, driver: format, values });
      assert.equal(actual, snapshot.goldens[key]);
    });
  }
});

describe("isSupported matrix", () => {
  for (const db of DATABASE_IDS) {
    for (const format of /** @type {const} */ (["odbc", "oledb", "adonet"])) {
      it(`${db} / ${format}`, () => {
        const expected = DATABASES[db].drivers.includes(format);
        assert.equal(isSupported(db, format), expected);
        if (!expected) {
          assert.equal(
            buildConnectionString({
              db,
              driver: format,
              values: {
                host: "x",
                port: "1",
                database: "d",
                username: "u",
                password: "p",
                driverName: "D",
                authMode: "sql",
                osAuth: false,
                encrypt: false,
                connectionTimeout: "",
                useDsn: false,
                dsn: "",
                schema: "",
                db2ConnectMode: "hostname",
                dbAlias: "",
                oracleConnectMode: "easyconnect",
                packageCollection: "",
                sslMode: "off",
                charset: "",
                sqliteInMemory: false,
                sqliteVersion: "3",
              },
            }),
            ""
          );
        }
      });
    }
  }
});
