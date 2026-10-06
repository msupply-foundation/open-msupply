// The dashboard's only data source: one JSON file, rewritten on a loop.
//
// WHY A FILE RATHER THAN AN ENDPOINT
//
// The page that serves this is on `oms-edge` and therefore reachable from
// wherever the edge proxy is reachable from - the office network and the VPN. Anything holding
// /var/run/docker.sock has root on the box - the `:ro` on a socket mount
// applies to the socket FILE, not to the API behind it, so it buys nothing.
// Splitting the two is the whole design: this process has the socket and no
// listener, the `dashboard` container has a listener and no socket, and the only
// thing crossing between them is a JSON file on a shared volume. There is no
// request path from the web to the daemon, so there is nothing to authenticate
// and nothing to get wrong.
//
// It also means the dashboard degrades the right way. If this process dies the
// page keeps serving the last snapshot, visibly stale (it renders the age of
// `generatedAt`), rather than going blank or 500ing.
//
// WHY IT KNOWS NOTHING ABOUT GITHUB
//
// Commit subjects, "N behind" and "deploying now" are looked up by web.mjs,
// with the token of whoever is signed in and looking. So there is no
// standing credential on the box at all, and this process needs no network -
// compose runs it with `network_mode: none`. When nobody has the page open,
// nothing calls GitHub.
//
// WHY THE ENGINE API AND NOT THE docker CLI
//
// Two reasons, and the second is the one that decided it. `/containers/json`
// returns labels as an OBJECT, where `docker ps --format` returns them as a
// comma-joined string that has to be split - and the workflows already carry a
// scar from tab-splitting label output (see `parseLabels` in
// .github/scripts/deploy-plan.js, and the comment above it about trimming
// before splitting). And `docker system df -v` REFUSES `--format`, so volume
// sizes off the CLI are column-position parsing of a human table, whereas
// `/system/df` returns `UsageData.Size` as an integer.
//
// The consequence worth knowing is that this needs no docker CLI in the image,
// which is why it runs on a stock `node:*-alpine` with nothing installed.
//
// WHAT IT DOES NOT DO
//
// It does not write. Not to the daemon, not to GitHub, not to a container.
// Every mutation in this system goes through a workflow dispatch - the
// dashboard's buttons included, which web.mjs turns into one - because a
// deployment's configuration is re-derived from labels on each deploy and a
// second writer is how those drift. Docker labels are immutable on a running
// container anyway - there is no `docker container update --label` - so even
// "extend the expiry" is necessarily a redeploy. See docker/compose.deploy.yaml.

import { request } from 'node:http';
import { writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOCKET = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const OUT = process.env.SNAPSHOT_OUT || '/snapshot/deployments.json';
const DOMAIN = process.env.DEPLOY_DOMAIN || '';

const secs = (name, fallback) => Number(process.env[name] || fallback) * 1000;
// Docker is local and cheap, so it sets the page's refresh rate. `/system/df`
// walks every layer and volume on the box, which on a busy deploy box is
// seconds, so it gets a slower clock.
const TICK = secs('TICK_SECONDS', 15);
const DF_EVERY = secs('DF_SECONDS', 300);

// The label every deployment carries. It is the filter rather than a name
// pattern because names are arbitrary - `vaccine-flow` is as much a deployment
// as `pr-470` - and because docker-expire.yaml already treats the presence of
// this label as the definition of "something this system manages".
const MANAGED = 'oms.expires';

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------------------------------------------------------------------------
// Docker
// ---------------------------------------------------------------------------

/**
 * GET a path on the Engine API over the unix socket.
 *
 * Unversioned: the daemon serves its own newest API version at these paths, so
 * this does not have to track what the box has installed. Both endpoints used
 * here have been stable for many years.
 */
function docker(path) {
  return new Promise((resolve, reject) => {
    const req = request({ socketPath: SOCKET, path, method: 'GET' }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`docker ${path} -> ${res.statusCode}: ${body.slice(0, 200)}`));
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`docker ${path} -> unparseable: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    // `/system/df` is the slow one and it is the reason this is not shorter.
    req.setTimeout(60_000, () => req.destroy(new Error(`docker ${path} timed out`)));
    req.end();
  });
}

const containers = () =>
  docker(
    '/containers/json?all=true&filters=' +
      encodeURIComponent(JSON.stringify({ label: [MANAGED] })),
  );

/**
 * Bytes on disk per compose project.
 *
 * compose namespaces a project's volumes as `<project>_<volume>`, and the
 * project IS the deployment name (docker/compose.deploy.yaml sets
 * `name: ${OMS_PROJECT}`), so the prefix is the join key. Summed rather than
 * listed because the three volumes - database, app data, logs - are one
 * deployment's footprint as far as "what is filling this box" is concerned.
 *
 * Best effort by design: a daemon that does not report `UsageData` yields no
 * sizes and the page simply omits the column. Nothing else depends on it.
 */
async function volumeBytes() {
  const df = await docker('/system/df');
  const out = new Map();
  for (const v of df.Volumes || []) {
    const size = v.UsageData?.Size;
    if (typeof size !== 'number' || size < 0) continue;
    const underscore = v.Name.indexOf('_');
    if (underscore < 1) continue;
    const project = v.Name.slice(0, underscore);
    out.set(project, (out.get(project) || 0) + size);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reading a deployment off its container
// ---------------------------------------------------------------------------

/**
 * The commit a running container is actually on.
 *
 * There is no commit label and no build-arg stamp on the image, so the tag is
 * the only record - but it is a reliable one, because `imageRef` in
 * .github/scripts/deploy-plan.js builds every tag as
 *
 *   <version>-<db>-<arch>[-dev][-debug]     version = `${name}-${sha7}`
 *
 * and `name` is the container name we already hold. Stripping the known
 * trailing variant markers and then the `<name>-` prefix leaves the sha, and
 * anchoring on the name rather than "the last hyphenated segment" is what keeps
 * a name that itself contains a hex-looking segment from parsing as a commit.
 *
 * A release tag is deployed as its own published image (`v2.8.0-postgres-amd64`,
 * see docker-named-deployment.yaml), so it carries no sha at all and is
 * reported as a release instead. That is not a gap: a release tag identifies
 * the code more precisely than a sha does for the people reading this page.
 */
export function commitFromImage(image, name) {
  const colon = String(image).lastIndexOf(':');
  // No tag at all means `:latest`, which this system never deploys - but a
  // registry host with a port has a colon too, so require a tag-shaped tail.
  let version = colon === -1 ? '' : image.slice(colon + 1);
  if (version.includes('/')) version = '';

  // `-debug` and `-dev` are one family of trailing variant markers and may both
  // be present; cleanup-docker-tags.mjs strips them with the same rule.
  let prev;
  do {
    prev = version;
    version = version.replace(/-(dev|debug)$/, '');
  } while (version !== prev);
  version = version.replace(/-(amd64|arm64)$/, '').replace(/-(postgres|sqlite)$/, '');

  if (version.startsWith(`${name}-`)) {
    const rest = version.slice(name.length + 1);
    if (/^[0-9a-f]{7,40}$/.test(rest)) return { sha: rest, release: null };
  }
  if (/^v\d+\.\d+\.\d+/.test(version)) return { sha: null, release: version };
  return { sha: null, release: null };
}

/**
 * Health out of the `Status` string, e.g. `Up 2 hours (healthy)`.
 *
 * `/containers/json` does not carry `State.Health` - that needs a per-container
 * inspect - and the string is a stable, documented part of the ps output. An
 * unrecognised string yields null rather than a guess, and the page then shows
 * the raw status, which is more honest than inventing a colour for it.
 */
export function healthFromStatus(status) {
  const m = /\((healthy|unhealthy|health: starting)\)/.exec(status || '');
  if (!m) return null;
  return m[1] === 'health: starting' ? 'starting' : m[1];
}

function readContainer(c, sizes) {
  // `Names` is an array of paths - `/develop` - because a container can have
  // several network aliases. The first, minus its slash, is the container name,
  // which compose.deploy.yaml pins to OMS_PROJECT and the proxy routes by.
  const name = (c.Names?.[0] || '').replace(/^\//, '');
  const labels = c.Labels || {};
  const { sha, release } = commitFromImage(c.Image, name);
  const preview = /^pr-\d+$/.test(name);

  return {
    name,
    kind: preview ? 'preview' : 'named',
    pr: preview ? Number(name.slice(3)) : null,
    url: DOMAIN ? `https://${name}.${DOMAIN}` : null,

    state: c.State,
    status: c.Status,
    health: healthFromStatus(c.Status),
    // Unix seconds. This is when the CONTAINER was created, which is when the
    // deployment last happened - a redeploy recreates it rather than restarting
    // it, so this is the "deployed N minutes ago" everyone actually wants.
    createdAt: new Date(c.Created * 1000).toISOString(),

    image: c.Image,
    sha,
    release,

    // Absent labels read the same way the workflows read them: see `parseLabels`
    // in deploy-plan.js. Anything deployed before a label existed must not be
    // reported as something it is not.
    branch: labels['oms.branch'] || null,
    profile: labels['oms.profile'] === 'debug' ? 'debug' : 'release',
    central: labels['oms.central'] === 'true',
    expires: labels[MANAGED] || 'never',
    // Who asked for the deploy: the name typed into the dashboard, or whoever
    // pushed or dispatched. Absent on anything deployed before the label was.
    actor: labels['oms.actor'] || null,

    bytes: sizes.get(name) ?? null,

    // Filled in by web.mjs's `enrich`, with a signed-in viewer's token.
    commit: null,
    behind: null,
    branchHead: null,
    deploy: null,
  };
}

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

/**
 * `develop` first, then the other named deployments, then previews newest
 * first. Not alphabetical: the overwhelmingly common reason to open this page
 * is to check whether a merge has landed on develop, and that should not need
 * scrolling past thirty previews.
 */
function order(a, b) {
  const rank = d => (d.name === 'develop' ? 0 : d.kind === 'named' ? 1 : 2);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a.kind === 'preview' && b.kind === 'preview') return b.pr - a.pr;
  return a.name.localeCompare(b.name);
}

let lastDf = 0;
let sizes = new Map();

async function tick() {
  const errors = [];

  let list = [];
  try {
    if (Date.now() - lastDf >= DF_EVERY) {
      sizes = await volumeBytes();
      lastDf = Date.now();
    }
  } catch (e) {
    errors.push(`disk usage unavailable: ${e.message}`);
  }

  try {
    list = (await containers()).map(c => readContainer(c, sizes)).sort(order);
  } catch (e) {
    // Without the daemon there is nothing to report at all, so leave the last
    // snapshot in place and let the page age it. Overwriting it with an empty
    // list would read as "nothing is deployed", which is a different and much
    // worse claim than "I cannot see".
    log(`docker unavailable: ${e.message}`);
    return;
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    domain: DOMAIN || null,
    tickSeconds: TICK / 1000,
    errors,
    deployments: list,
  };

  // Atomic: web.mjs may be reading this file at any instant, and a partially
  // written one is a JSON parse error on the page rather than a stale read.
  // Same directory, so the rename cannot cross a filesystem.
  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(tmp, OUT);
}

async function main() {
  await mkdir(dirname(OUT), { recursive: true });
  log(`watching ${SOCKET}, writing ${OUT} every ${TICK / 1000}s`);

  // Every error is caught and recorded rather than thrown, because `restart:
  // unless-stopped` on a process that exits during a daemon blip is a crash
  // loop, and a crash loop reports nothing at all.
  for (;;) {
    try {
      await tick();
    } catch (e) {
      log(`tick failed: ${e.stack || e.message}`);
    }
    await new Promise(r => setTimeout(r, TICK));
  }
}

// Guarded so the two pure parsers above can be imported and exercised without
// starting a loop against a docker socket. They are the load-bearing bit - a
// tag this file cannot read is a dashboard that cannot answer its one question
// - and if this graduates out of prototype they belong in
// .github/scripts/deploy-plan.js beside `imageRef`, which is what builds the
// tags they take apart, and where there is already a test runner.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
