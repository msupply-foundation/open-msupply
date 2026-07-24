#!/usr/bin/env node
/*
 * One-command hermetic e2e run against the committed reference datafile.
 *
 *   cd client
 *   yarn e2e:local                          # whole suite
 *   yarn e2e:local stocktake-regression     # one suite
 *   yarn e2e:local stocktake-regression --headed
 *
 * What it does: builds the (sqlite) server + CLI, restores a throwaway
 * database from server/data/e2e, boots the server and a webpack dev server
 * on dedicated ports, waits for both, runs the deterministic regression
 * suites, tears everything down. Store-local data (stock) is arranged by
 * the suites' data.setup.ts through the API — the datafile deliberately
 * contains none (see server/data/e2e/README.md).
 *
 * The suites themselves are DEFINED IN open-msupply-frontend (e2e/ there —
 * the cross-FE test-id contract, e2e/TESTIDS.md, lets one suite definition
 * verify both front ends), so this script needs a checkout of that repo
 * alongside the server + front end it builds here.
 *
 * Knobs (all optional):
 *   FE_SUITES_DIR     open-msupply-frontend checkout (default:
 *                     ../open-msupply-frontend next to this repo)
 *   E2E_SERVER_PORT   backend port  (default 9920; discovery uses port+1)
 *   E2E_FE_PORT       front-end port (default 3113)
 *   KEEP_SERVER=1     leave the server + FE running after the tests
 *
 * Plain Node, no npm dependencies (same rationale as build/fetch-frontend.js):
 * Node is the one runtime every e2e environment already has — macOS/Linux
 * dev machines, CI, and Windows, where the bash original couldn't run
 * (lsof, process groups).
 */

"use strict";

const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const WIN = process.platform === "win32";
const EXE = WIN ? ".exe" : "";

const SERVER_PORT = Number(process.env.E2E_SERVER_PORT || 9920);
const FE_PORT = Number(process.env.E2E_FE_PORT || 3113);
const DB_NAME = "e2e_playwright"; // -> server/e2e_playwright.sqlite (gitignored)

// Neutralise any sync credentials in the developer's local.yaml. Empty core
// fields make the merged sync settings count as "not configured", so the
// server can't try to re-authenticate this throwaway site against a real
// central on startup (which would panic or overwrite the restored settings).
// All four must be set together or settings validation rejects the block.
const SYNC_OFF = {
  APP__SYNC__URL: "",
  APP__SYNC__USERNAME: "",
  APP__SYNC__PASSWORD_SHA256: "",
  APP__SYNC__INTERVAL_SECONDS: "0",
};

const SCRIPT_DIR = __dirname; // client/playwright/scripts
const CLIENT_DIR = path.resolve(SCRIPT_DIR, "..", ".."); // client
const SERVER_DIR = path.resolve(CLIENT_DIR, "..", "server");

function die(message) {
  console.error(message);
  process.exit(1);
}

function tailFile(file, lines) {
  try {
    return fs.readFileSync(file, "utf8").split("\n").slice(-lines).join("\n");
  } catch {
    return "(no log)";
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Suites repo
// ---------------------------------------------------------------------------
const FE_SUITES_DIR = path.resolve(
  process.env.FE_SUITES_DIR || path.join(CLIENT_DIR, "..", "..", "open-msupply-frontend"),
);
if (!fs.existsSync(path.join(FE_SUITES_DIR, "e2e", "specs"))) {
  die(
    `FE_SUITES_DIR (${FE_SUITES_DIR}) is not an open-msupply-frontend checkout\n` +
      "  git clone https://github.com/msupply-foundation/open-msupply-frontend\n" +
      "  then set FE_SUITES_DIR if it isn't ../open-msupply-frontend",
  );
}
// Stack logs go in the suites repo (so CI uploads one coherent artifact)
// but in their own dir — Playwright wipes its outputDir (e2e/test-results)
// at run start, which would eat logs written before it.
const LOG_DIR = path.join(FE_SUITES_DIR, "e2e", "stack-logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Child processes and cleanup
// ---------------------------------------------------------------------------
// Each entry: {name, child}. Killed as a tree — webpack survives a plain
// kill of its yarn parent, which is why the bash original needed lsof sweeps.
const children = [];

// yarn/pnpm are .cmd shims on Windows, so they need a shell there (their args
// here never contain spaces or cmd metacharacters); direct executables must
// NOT get one, or a repo path with spaces breaks the cmd.exe join. A shell on
// POSIX would put the real process another fork away from the group we kill.
const needsShell = (cmd) => WIN && ["yarn", "pnpm"].includes(cmd);

function startChild(name, cmd, args, { cwd, env, logFile }) {
  const fd = fs.openSync(logFile, "w");
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", fd, fd],
    detached: !WIN, // POSIX: own process group, so kill(-pid) reaps the tree
    shell: needsShell(cmd),
    windowsHide: true,
  });
  children.push({ name, child });
  return child;
}

function killTree(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (WIN) {
    // /t kills the whole tree (cmd shim, node, webpack workers).
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
  } else {
    try {
      process.kill(-child.pid, signal); // whole process group
    } catch {
      try {
        process.kill(child.pid, signal);
      } catch {}
    }
  }
}

let cleanedUp = false;
async function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  if (process.env.KEEP_SERVER === "1") {
    console.log(
      `KEEP_SERVER=1 — server http://localhost:${SERVER_PORT}, FE http://localhost:${FE_PORT} left running`,
    );
    return;
  }
  for (const { child } of children) killTree(child, "SIGTERM");
  // The server sometimes ignores a plain TERM — escalate to KILL.
  await sleep(1000);
  for (const { child } of children) killTree(child, "SIGKILL");
}

// Ctrl-C / TERM: tear the stack down before exiting. The 'exit' handler
// can't await, so it only fires the synchronous KILL as a last resort.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    cleanup().then(() => process.exit(130));
  });
}
process.on("exit", () => {
  if (cleanedUp || process.env.KEEP_SERVER === "1") return;
  for (const { child } of children) killTree(child, "SIGKILL");
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// A LISTEN probe replaces the original's lsof: binding succeeds only if
// nothing else holds the port.
function portFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port);
  });
}

// Foreground helper for the sequential steps (installs, cargo build, cli).
function runSync(name, cmd, args, { cwd, env, logFile } = {}) {
  const stdio = logFile
    ? ["ignore", fs.openSync(logFile, "w"), "pipe"]
    : "inherit";
  const res = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio,
    shell: needsShell(cmd),
    windowsHide: true,
  });
  if (logFile && res.stderr) fs.appendFileSync(logFile, res.stderr);
  if (res.status !== 0) {
    if (logFile) {
      console.error(`${name} failed:`);
      console.error(tailFile(logFile, 20));
    }
    die(`${name} failed (exit ${res.status})`);
  }
}

async function waitFor(label, attempts, probe) {
  process.stdout.write(`Waiting for ${label}`);
  for (let i = 0; i < attempts; i++) {
    if (await probe()) {
      console.log(" — ready");
      return true;
    }
    process.stdout.write(".");
    await sleep(2000);
  }
  console.log("");
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  for (const port of [SERVER_PORT, SERVER_PORT + 1, FE_PORT]) {
    if (!(await portFree(port))) {
      die(`Port ${port} is in use — set E2E_SERVER_PORT / E2E_FE_PORT`);
    }
  }

  // Fresh-checkout bootstrap: JS deps for this FE (webpack dev server) and
  // for the suites repo, plus the suites' Playwright browser. All are fast
  // no-ops when already present. Linux needs the browser's system deps.
  if (!fs.existsSync(path.join(CLIENT_DIR, "node_modules"))) {
    runSync("yarn install", "yarn", ["install"], { cwd: CLIENT_DIR });
  }
  if (!fs.existsSync(path.join(FE_SUITES_DIR, "node_modules"))) {
    runSync("pnpm install", "pnpm", ["install", "--frozen-lockfile"], { cwd: FE_SUITES_DIR });
  }
  const browserInstall =
    process.platform === "linux"
      ? ["exec", "playwright", "install", "--with-deps", "chromium"]
      : ["exec", "playwright", "install", "chromium"];
  runSync("playwright install", "pnpm", browserInstall, { cwd: FE_SUITES_DIR });

  console.log("Building server + CLI (sqlite; a no-op when already built)");
  runSync("cargo build", "cargo", ["build", "--bin", "remote_server", "--bin", "remote_server_cli"], {
    cwd: SERVER_DIR,
  });
  // Honour CARGO_TARGET_DIR (CI shares a persistent target dir across jobs).
  const binDir = path.join(process.env.CARGO_TARGET_DIR || path.join(SERVER_DIR, "target"), "debug");

  console.log("Restoring database from server/data/e2e");
  for (const f of fs.readdirSync(SERVER_DIR)) {
    if (f.startsWith(`${DB_NAME}.sqlite`)) fs.rmSync(path.join(SERVER_DIR, f));
  }
  runSync(
    "initialise-from-export",
    path.join(binDir, `remote_server_cli${EXE}`),
    ["initialise-from-export", "-n", "e2e", "-r"],
    {
      cwd: SERVER_DIR,
      env: { MSUPPLY_NO_TEST_DB_TEMPLATE: "1", APP__DATABASE__DATABASE_NAME: DB_NAME, ...SYNC_OFF },
      logFile: path.join(LOG_DIR, "e2e-init.log"),
    },
  );

  console.log(`Starting server on :${SERVER_PORT}`);
  startChild("server", path.join(binDir, `remote_server${EXE}`), [], {
    cwd: SERVER_DIR,
    env: {
      APP__DATABASE__DATABASE_NAME: DB_NAME,
      APP__SERVER__PORT: String(SERVER_PORT),
      APP__SERVER__BASE_DIR: "app_data/e2e_local",
      APP__LOGGING__MODE: "Console",
      ...SYNC_OFF,
    },
    logFile: path.join(LOG_DIR, "e2e-server.log"),
  });

  const serverUp = await waitFor("server", 30, async () => {
    try {
      const res = await fetch(`http://localhost:${SERVER_PORT}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "query { initialisationStatus { status } }" }),
        signal: AbortSignal.timeout(2000),
      });
      return (await res.text()).includes("INITIALISED");
    } catch {
      return false;
    }
  });
  if (!serverUp) {
    console.error("Server failed to start:");
    console.error(tailFile(path.join(LOG_DIR, "e2e-server.log"), 20));
    die("");
  }

  console.log(`Starting front end on :${FE_PORT} (first compile can take a minute)`);
  startChild(
    "front end",
    "yarn",
    ["start", "--port", String(FE_PORT), "--env", `API_HOST=http://localhost:${SERVER_PORT}`],
    {
      cwd: path.join(CLIENT_DIR, "packages", "host"),
      env: {},
      logFile: path.join(LOG_DIR, "e2e-devserver.log"),
    },
  );

  await waitFor("front end", 90, async () => {
    try {
      await fetch(`http://localhost:${FE_PORT}`, { signal: AbortSignal.timeout(2000) });
      return true;
    } catch {
      return false;
    }
  });

  // Serial within a run: the suites share one database and use serial
  // describes; honour an explicit --workers from the caller.
  const args = process.argv.slice(2);
  if (!args.some((a) => a.startsWith("--workers"))) args.push("--workers", "1");

  // E2E_META_APP_VERSION: the suites config stamps the app-under-test version
  // into the report — that's this repo's client, not the suites repo.
  const appVersion = JSON.parse(
    fs.readFileSync(path.join(CLIENT_DIR, "package.json"), "utf8"),
  ).version;

  const code = await new Promise((resolve) => {
    const pw = spawn("pnpm", ["exec", "playwright", "test", "--config", "e2e/playwright.config.ts", ...args], {
      cwd: FE_SUITES_DIR,
      env: {
        ...process.env,
        BASE_URL: `http://localhost:${FE_PORT}`,
        API_URL: `http://localhost:${SERVER_PORT}`,
        E2E_META_APP_VERSION: appVersion,
      },
      stdio: "inherit",
      shell: needsShell("pnpm"),
      windowsHide: true,
    });
    pw.on("close", (c) => resolve(c ?? 1));
  });

  await cleanup();
  process.exit(code);
}

main().catch(async (err) => {
  console.error(err);
  await cleanup();
  process.exit(1);
});
