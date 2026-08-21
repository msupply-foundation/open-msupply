#!/usr/bin/env node
/*
 * stage-frontend.js — build the in-tree frontend (frontend/) and stage its dist.
 *
 * Replaces fetch-frontend.js from the two-repo era: the new FE used to be a
 * pinned, checksum-verified release asset of the (private) open-msupply-frontend
 * repo. It now lives in this repo, so every packaging pipeline builds it from
 * the working tree — the shipped FE is always the FE of the commit being built;
 * there is no pin to bump, no token to mint, and no stale-pairing failure mode.
 *
 * Usage:
 *     node build/stage-frontend.js <target-dir>
 *
 * Builds frontend/ (corepack pnpm — the pnpm version comes from
 * frontend/package.json's packageManager, no globally enabled corepack shims
 * needed; the repo root workspace is yarn) and replaces <target-dir> with the
 * built dist. Callers that nest the old UI under <target-dir>/old-ui must do so
 * AFTER this runs.
 *
 * Plain Node, no npm dependencies — every build environment already has Node
 * for the client build. Cross-platform: used by the mac, Windows, docker, and
 * Android packaging pipelines.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const FE_DIR = path.join(REPO_ROOT, "frontend");

function die(message) {
  console.error("\nstage-frontend: " + message + "\n");
  process.exit(1);
}

function log(message) {
  console.log("stage-frontend: " + message);
}

function run(cmd) {
  log(cmd + "  (in frontend/)");
  execSync(cmd, { cwd: FE_DIR, stdio: "inherit" });
}

const target = process.argv[2];
if (!target) die("usage: node build/stage-frontend.js <target-dir>");
const targetDir = path.resolve(target);

run("corepack pnpm install --frozen-lockfile");
run("corepack pnpm build");

const dist = path.join(FE_DIR, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) {
  die("frontend/dist has no index.html at its root — build failed?");
}

// Replace the target wholesale so a stale mixed dist can never ship.
fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });
fs.cpSync(dist, targetDir, { recursive: true });
log("staged frontend dist -> " + targetDir);
