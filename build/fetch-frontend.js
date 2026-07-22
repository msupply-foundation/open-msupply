#!/usr/bin/env node
/*
 * fetch-frontend.js — download, verify and unpack the pinned open-msupply-frontend dist.
 *
 * The new frontend lives in a separate repo (msupply-foundation/open-msupply-frontend)
 * which publishes, per git tag, a release asset pair:
 *     frontend-dist-<tag>.zip          (bundle at zip top level: index.html at root, VERSION.txt inside)
 *     frontend-dist-<tag>.zip.sha256
 * This repo commits which one it ships in frontend-version.json (the "pin"). This
 * script reads that pin, downloads the zip, checks its sha256 against the pin, and
 * unpacks it into a target directory (given as argv[2]).
 *
 * Usage:
 *     node build/fetch-frontend.js <target-dir>
 *
 * Environment:
 *     FRONTEND_DIST_URL     Override the download source. Any http(s):// URL, a
 *                           file:// URL, or a plain local filesystem path. Used for
 *                           local testing and for later B2 hosting. When set, the pin
 *                           tag is not used to build the URL (the pin sha256 is still
 *                           enforced unless FRONTEND_DIST_SHA256=skip).
 *     FRONTEND_FETCH_TOKEN  Token used to authenticate the download. REQUIRED for the
 *     GITHUB_TOKEN          default GitHub source because open-msupply-frontend is a
 *                           PRIVATE repo. Private-repo assets 404 on the
 *                           releases/download/ browser URL even with a valid token, so
 *                           the script resolves the asset id via the REST API and
 *                           downloads the api.github.com asset endpoint with
 *                           `Accept: application/octet-stream`. The Authorization
 *                           header is dropped when GitHub redirects to its asset CDN
 *                           (a signed URL that rejects a second auth mechanism).
 *                           FRONTEND_FETCH_TOKEN wins if both are set.
 *     FRONTEND_DIST_SHA256  `skip` disables checksum verification, but ONLY when
 *                           FRONTEND_DIST_URL is also set (tamper-by-default fails
 *                           loudly). Any other value overrides the pin's expected
 *                           sha256 (handy for testing / ad-hoc hosting).
 *
 * Plain Node, no npm dependencies — both build environments have Node for the client build.
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const http = require("http");
const { execFileSync } = require("child_process");
const { URL } = require("url");

const REPO_ROOT = path.resolve(__dirname, "..");
const PIN_FILE = path.join(REPO_ROOT, "frontend-version.json");
const PLACEHOLDER_TAG = "v0.0.0-placeholder";

function die(message) {
  console.error("\nfetch-frontend: " + message + "\n");
  process.exit(1);
}

function log(message) {
  console.log("fetch-frontend: " + message);
}

// ---------------------------------------------------------------------------
// Pin file
// ---------------------------------------------------------------------------
function readPin() {
  let raw;
  try {
    raw = fs.readFileSync(PIN_FILE, "utf8");
  } catch (err) {
    die("could not read pin file " + PIN_FILE + ": " + err.message);
  }
  let pin;
  try {
    pin = JSON.parse(raw);
  } catch (err) {
    die("pin file " + PIN_FILE + " is not valid JSON: " + err.message);
  }
  if (!pin.tag) die("pin file " + PIN_FILE + ' is missing "tag"');
  if (!pin.sha256) die("pin file " + PIN_FILE + ' is missing "sha256"');
  pin.repo = pin.repo || "msupply-foundation/open-msupply-frontend";
  return pin;
}

// ---------------------------------------------------------------------------
// Download (http/https with redirect handling, or local file copy)
// ---------------------------------------------------------------------------
function getToken() {
  return process.env.FRONTEND_FETCH_TOKEN || process.env.GITHUB_TOKEN || null;
}

// Follow redirects manually so we can strip the Authorization header when the
// host changes — GitHub 302s a token-authenticated asset request to a signed CDN
// URL that rejects requests carrying a second auth mechanism.
function httpDownload(urlStr, destPath, token, redirectsLeft, originHost) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) return reject(new Error("too many redirects"));
    const url = new URL(urlStr);
    const client = url.protocol === "http:" ? http : https;
    const headers = {
      "User-Agent": "open-msupply-fetch-frontend",
      Accept: "application/octet-stream",
    };
    // Only send the token to the original host, never to a redirect target.
    if (token && (!originHost || url.host === originHost)) {
      headers.Authorization = "token " + token;
    }
    const req = client.get(url, { headers }, (res) => {
      const status = res.statusCode;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        resolve(
          httpDownload(
            next,
            destPath,
            token,
            redirectsLeft - 1,
            originHost || url.host,
          ),
        );
        return;
      }
      if (status !== 200) {
        res.resume();
        let hint = "";
        if (status === 401 || status === 403) {
          hint =
            " — check FRONTEND_FETCH_TOKEN/GITHUB_TOKEN has access to the private repo";
        } else if (status === 404) {
          hint =
            " — asset not found; is the pinned tag released yet, and does the token have access?";
        }
        return reject(
          new Error("HTTP " + status + " fetching " + urlStr + hint),
        );
      }
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on("finish", () => out.close(resolve));
      out.on("error", reject);
    });
    req.on("error", reject);
  });
}

function httpGetJson(urlStr, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const headers = {
      "User-Agent": "open-msupply-fetch-frontend",
      Accept: "application/vnd.github+json",
    };
    if (token) headers.Authorization = "token " + token;
    https
      .get(url, { headers }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            let hint = "";
            if (res.statusCode === 401 || res.statusCode === 403) {
              hint =
                " — check FRONTEND_FETCH_TOKEN/GITHUB_TOKEN has access to the private repo";
            } else if (res.statusCode === 404) {
              hint = " — does the pinned tag have a published release?";
            }
            return reject(
              new Error(
                "HTTP " + res.statusCode + " fetching " + urlStr + hint,
              ),
            );
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(
              new Error("invalid JSON from " + urlStr + ": " + err.message),
            );
          }
        });
      })
      .on("error", reject);
  });
}

// Private-repo release assets 404 on the releases/download/ browser URL even
// with a valid token — the supported path is the REST asset endpoint with
// Accept: application/octet-stream (which 302s to a signed CDN URL).
async function resolveGithubAssetUrl(pin, token) {
  const assetName = "frontend-dist-" + pin.tag + ".zip";
  const release = await httpGetJson(
    "https://api.github.com/repos/" + pin.repo + "/releases/tags/" + pin.tag,
    token,
  );
  const asset = (release.assets || []).find((a) => a.name === assetName);
  if (!asset) {
    die(
      "release " +
        pin.tag +
        ' has no asset "' +
        assetName +
        '" — did the release-dist workflow publish it?',
    );
  }
  return (
    "https://api.github.com/repos/" + pin.repo + "/releases/assets/" + asset.id
  );
}

function localFilePath(source) {
  if (source.startsWith("file://")) return new URL(source).pathname;
  return source;
}

async function fetchZip(source, destPath) {
  if (/^https?:\/\//.test(source)) {
    const token = getToken();
    if (source.indexOf("github.com") !== -1 && !token) {
      die(
        "downloading from GitHub but no token set. open-msupply-frontend is private —\n" +
          "  set FRONTEND_FETCH_TOKEN (or GITHUB_TOKEN) to a token with read access to release assets.",
      );
    }
    log("downloading " + source);
    await httpDownload(source, destPath, token, 5, null);
  } else {
    const filePath = localFilePath(source);
    if (!fs.existsSync(filePath)) {
      die("local dist not found: " + filePath);
    }
    log("copying local dist " + filePath);
    fs.copyFileSync(filePath, destPath);
  }
}

// ---------------------------------------------------------------------------
// Checksum
// ---------------------------------------------------------------------------
function sha256Of(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

// ---------------------------------------------------------------------------
// Unzip (cross-platform, no npm deps)
// ---------------------------------------------------------------------------
function hasCommand(cmd) {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    execFileSync(which, [cmd], { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

function unzip(zipPath, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  if (hasCommand("unzip")) {
    execFileSync("unzip", ["-q", "-o", zipPath, "-d", targetDir], {
      stdio: "inherit",
    });
    return;
  }
  // Windows fallbacks: bsdtar (tar -xf handles zip) then PowerShell Expand-Archive.
  if (hasCommand("tar")) {
    execFileSync("tar", ["-xf", zipPath, "-C", targetDir], {
      stdio: "inherit",
    });
    return;
  }
  if (hasCommand("powershell")) {
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Expand-Archive -Force -LiteralPath " +
          JSON.stringify(zipPath) +
          " -DestinationPath " +
          JSON.stringify(targetDir),
      ],
      { stdio: "inherit" },
    );
    return;
  }
  die(
    "no unzip tool found (need one of: unzip, tar/bsdtar, powershell Expand-Archive)",
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const target = process.argv[2];
  if (!target) {
    die("usage: node build/fetch-frontend.js <target-dir>");
  }
  const targetDir = path.resolve(target);

  const pin = readPin();
  const urlOverride = process.env.FRONTEND_DIST_URL || null;
  const shaEnv = process.env.FRONTEND_DIST_SHA256 || null;

  // Resolve source.
  let source;
  if (urlOverride) {
    source = urlOverride;
    log("using FRONTEND_DIST_URL override");
  } else {
    if (pin.tag === PLACEHOLDER_TAG) {
      die(
        "pin is the placeholder (" +
          PLACEHOLDER_TAG +
          ") — open-msupply-frontend has no release yet.\n" +
          "  Set FRONTEND_DIST_URL to a real dist zip (local path or URL), or bump frontend-version.json\n" +
          "  once the FE repo cuts a release. Refusing to fall back to an in-tree build for the root FE.",
      );
    }
    const token = getToken();
    if (!token) {
      die(
        "downloading from GitHub but no token set. open-msupply-frontend is private —\n" +
          "  set FRONTEND_FETCH_TOKEN (or GITHUB_TOKEN) to a token with read access to release assets.",
      );
    }
    source = await resolveGithubAssetUrl(pin, token);
  }

  // Resolve expected checksum / skip policy.
  let expectedSha = pin.sha256;
  let skipVerify = false;
  if (shaEnv === "skip") {
    if (!urlOverride) {
      die(
        "FRONTEND_DIST_SHA256=skip is only allowed together with FRONTEND_DIST_URL",
      );
    }
    skipVerify = true;
  } else if (shaEnv) {
    expectedSha = shaEnv;
  }

  // Work in a temp dir; stage-then-swap into the target so an interrupted unpack
  // can never leave a half dist behind.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-frontend-"));
  const zipPath = path.join(workDir, "frontend-dist.zip");
  const stageDir = path.join(workDir, "stage");

  try {
    await fetchZip(source, zipPath);

    if (skipVerify) {
      log("checksum verification skipped (FRONTEND_DIST_SHA256=skip)");
    } else {
      const actual = sha256Of(zipPath);
      if (actual.toLowerCase() !== String(expectedSha).toLowerCase()) {
        die(
          "checksum mismatch — refusing to unpack.\n" +
            "  expected: " +
            expectedSha +
            "\n  actual:   " +
            actual +
            "\n  (from " +
            source +
            ")",
        );
      }
      log("checksum OK (" + actual + ")");
    }

    unzip(zipPath, stageDir);

    if (!fs.existsSync(path.join(stageDir, "index.html"))) {
      die("unpacked dist has no index.html at its root — wrong zip layout?");
    }

    // Swap into place: wipe target, then move staged dist over.
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    try {
      fs.renameSync(stageDir, targetDir);
    } catch (err) {
      // rename across filesystems (EXDEV) — fall back to recursive copy.
      if (err.code === "EXDEV") {
        fs.cpSync(stageDir, targetDir, { recursive: true });
      } else {
        throw err;
      }
    }
    log("unpacked frontend dist -> " + targetDir);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((err) => die(err.message));
