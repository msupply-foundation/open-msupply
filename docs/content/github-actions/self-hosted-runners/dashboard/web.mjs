// The dashboard's web side: signs people in with GitHub, serves them the
// snapshot with what GitHub knows about each deployment added, and turns a
// click into a workflow dispatch.
//
// WHY A DISPATCH, AND NOT A DEPLOY
//
// Every change to a deployment still goes through the workflow that already
// owns it - docker-named-deployment.yaml or docker-pr-preview.yaml, dispatched
// on `develop`. This process does not deploy anything, and it cannot: it has no
// docker socket. All it can do is start those two workflows, which is exactly
// as much power as their dispatch forms already give anyone with write access
// to the repository.
//
// That keeps one writer. A deployment's configuration lives in its container
// labels and is re-derived on every deploy, so a second thing writing to
// containers is how those would drift. And the run logs, the deployment records
// and the "deploying now" pill all keep working, because a click here IS a run.
//
// WHO CLICKED
//
// Each person signs in with GitHub, and their click is dispatched with THEIR
// token, not a shared one. So GitHub itself records who started the run, the
// deploy records them as `oms.actor` (docker-deploy.yaml takes it from
// `github.triggering_actor`), and GitHub decides whether they may: someone without write access to
// the repository gets GitHub's refusal, not a deploy.
//
// The sign-in is a GitHub App's user authorization, not an OAuth App's. An
// OAuth App token is `repo`-scoped - everything the person can do, everywhere -
// where a GitHub App user token can do only what the App is allowed AND the
// person is allowed, which here is "start workflows in this one repository".
// It is held in memory on this process and never sent to the browser, which
// gets an opaque session cookie instead. A restart signs everyone out; that is
// the whole cost of having no store.
//
// SIGNED IN TO SEE ANYTHING, AND NO TOKEN OF ITS OWN
//
// The page shows nothing until you sign in, and the sign-in is refused unless
// GitHub says you can see the repository - any GitHub user can authorize an
// App, so being signed in alone proves nothing. Read access shows the page;
// write access adds the buttons.
//
// The reads use the viewer's token too. Commit subjects, "N behind" and
// "deploying now" are looked up with the token of whoever is looking, on a
// clock and cached, and the cache is shared - everyone it is shown to has been
// checked for read access to the same repository. So there is no standing
// credential on the box, and when nobody has the page open nothing calls
// GitHub at all.
//
// REQUESTS FROM OTHER PAGES
//
// A signed-in session must not mean any web page a colleague has open may drive
// it. The session cookie is SameSite=Lax, so a cross-site POST does not carry
// it. Independently, a cross-site form post cannot set a custom header, and a
// cross-site fetch that does is preflighted - which this server does not answer
// - so requiring `x-dashboard: 1` refuses a request the page itself did not
// send. The Origin check is belt and braces.
//
// No dependencies, like snapshot.mjs: stock `node:*-alpine`, nothing to build.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.PORT || 8000);
const ROOT = process.env.WEB_ROOT || '/srv';
const SNAPSHOT = process.env.SNAPSHOT_FILE || '/srv/snapshot/deployments.json';
const REPO = process.env.GITHUB_REPOSITORY || '';
const API = (process.env.GITHUB_API || 'https://api.github.com').replace(/\/$/, '');
// Where the sign-in pages live. Separate from API because they are on
// github.com rather than api.github.com; overridable, like API, so the whole
// sign-in can be run against a stub.
const WEB = (process.env.GITHUB_WEB || 'https://github.com').replace(/\/$/, '');
// The GitHub App that people sign in through. Both or neither: without them
// nobody can sign in, so the page shows nothing.
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
// This page's own address, for the sign-in callback, which must match the one
// registered on the App. Always https://dashboard.<DEPLOY_DOMAIN> on the box -
// and it has to be stated rather than read off the request: the edge proxy
// terminates TLS and forwards plain http, and the box's Caddy does not trust
// the edge's forwarded headers, so the request says `http` and GitHub would
// refuse the callback. Worked out from the request only when DEPLOY_DOMAIN is
// unset, which is trying it out on localhost.
const DOMAIN = process.env.DEPLOY_DOMAIN || '';
const PUBLIC_URL = DOMAIN ? `https://dashboard.${DOMAIN}` : '';
// The branch the workflows are dispatched on. `develop` because that is where
// their logic lives now - see docker-named-deployment.yaml - and a dispatch on
// any other branch would run that branch's copy of the trigger file.
const DISPATCH_REF = process.env.DISPATCH_REF || 'develop';
// How often GitHub is re-read for the deployments, while someone is looking.
const ENRICH_EVERY = Number(process.env.ENRICH_SECONDS || 60) * 1000;

const CAN_SIGN_IN = Boolean(CLIENT_ID && CLIENT_SECRET && REPO);

const WORKFLOWS = {
  named: 'docker-named-deployment.yaml',
  preview: 'docker-pr-preview.yaml',
};

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
//
// Repeated from the workflows rather than trusted to them, so a typo comes back
// as a message on the page in a second instead of a red run a minute later.
// The workflow still validates everything - this is the fast path, not the
// gate.

// deploy-plan.js NAME: what a deployment name must be, because it becomes a
// DNS label, a container name and a volume prefix.
const NAME = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/;
// Anything git would accept as a ref name, loosely. No spaces, no control
// characters, nothing that would need quoting.
const REF = /^[A-Za-z0-9._/-]{1,200}$/;
// Names a named deployment must not take. `pr-<n>` is how the page tells a
// preview from a named server, and a named one called that would collide with
// the PR's own preview; `dashboard` is this container's name and route.
const RESERVED = name => /^pr-\d+$/.test(name) || name === 'dashboard';
// The box's own compose projects and containers, refused for every action: a
// teardown or reseed of one would `docker compose -p <name> down -v` it. The
// same list as BOX_SERVICES in .github/scripts/deploy-plan.js.
const BOX_SERVICES = ['dashboard', 'oms-dashboard', 'oms-dashboard-snapshot', 'oms-proxy'];

const oneOf = (v, options, field) => {
  if (!options.includes(v)) throw new Error(`${field} must be one of ${options.join(', ')}`);
  return v;
};

// No "who" in either: the run is started with the person's own token, so
// `github.triggering_actor` is already them.
function namedInputs(b) {
  const action = oneOf(b.action || 'deploy', ['deploy', 'reseed', 'teardown'], 'action');
  const name = String(b.name || '').trim();
  if (!NAME.test(name)) {
    throw new Error(
      'The name must be 2-32 characters of lower-case letters, digits and hyphens, ' +
      'starting and ending with a letter or digit. It becomes the server\'s web address.',
    );
  }
  if (BOX_SERVICES.includes(name)) {
    throw new Error(`"${name}" is one of this box's own services, not a deployment.`);
  }
  // Only on the way in: a preview that already exists may still be removed.
  if (action === 'deploy' && RESERVED(name)) {
    throw new Error(`"${name}" is reserved - pr-<number> is a pull request's preview, and "dashboard" is this page. Pick another name.`);
  }
  const inputs = { name, action };
  if (action === 'teardown') return inputs;

  const ref = String(b.ref || '').trim();
  if (!REF.test(ref)) throw new Error('Say what to deploy: a branch, a tag like v3.02.01, or a commit.');
  const days = Number(b.days);
  if (!Number.isInteger(days) || days < 0 || days > 30) {
    throw new Error('Days must be a whole number from 0 to 30 (0 keeps it until someone removes it).');
  }
  return {
    ...inputs,
    ref,
    days: String(days),
    central: oneOf(b.central || 'keep', ['keep', 'central', 'remote'], 'central'),
    dataset: oneOf(b.dataset || 'default', ['default', 'e2e', 'reference1', 'none'], 'dataset'),
    profile: oneOf(b.profile || 'keep', ['keep', 'release', 'debug'], 'profile'),
  };
}

function previewInputs(b) {
  const pr = Number(b.pr);
  if (!Number.isInteger(pr) || pr <= 0) throw new Error('Not a pull request number.');
  return {
    pr: String(pr),
    action: oneOf(b.action || 'deploy', ['deploy', 'reseed', 'teardown'], 'action'),
  };
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

async function gh(path, init, token) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'oms-deployment-dashboard',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
}

class GitHubRefused extends Error {
  constructor(text, status) {
    super(githubMessage(text, status));
    this.status = status;
  }
}

/**
 * Start a workflow run as the signed-in person, and say where to watch it.
 *
 * Asks for the run's details back, so the page can link straight to the run
 * rather than to the workflow's list of runs. Older API behaviour answers 204
 * with no body; a server that does not know the parameter at all rejects it,
 * and is asked again without - the link then goes to the list, which is still
 * the right place, just one click further away.
 */
async function dispatch(workflow, inputs, token) {
  const list = `https://github.com/${REPO}/actions/workflows/${workflow}`;
  const send = details => gh(`/repos/${REPO}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: DISPATCH_REF, inputs, ...(details ? { return_run_details: true } : {}) }),
  }, token);

  let res = await send(true);
  if (res.status === 422) {
    const text = await res.text();
    if (/return_run_details/i.test(text)) res = await send(false);
    else throw new GitHubRefused(text, res.status);
  }
  if (res.status === 204) return { runUrl: list };
  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    return { runUrl: body.html_url || list };
  }
  throw new GitHubRefused(await res.text(), res.status);
}

function githubMessage(text, status) {
  // 403 and 404 are how GitHub says "this person may not": 404 rather than 403
  // for a private repository they cannot see at all. Either way the useful
  // answer is what they are missing, not the status code.
  if (status === 403 || status === 404) {
    return `GitHub would not let you run this (${status}). You need write access to ${REPO}.`;
  }
  try {
    const m = JSON.parse(text).message;
    if (m) return `GitHub refused the dispatch (${status}): ${m}`;
  } catch { /* not JSON */ }
  return `GitHub refused the dispatch (${status}).`;
}

// Every version tag, for "test a release". Cached because the list barely
// changes and every form opening asks for it. Read with whoever is asking.
//
// `git/matching-refs` rather than `/tags`, because the repository has well
// over a thousand tags and `/tags` pages through them in name order - junk like
// `vDemo-test-1` first - so its first page held almost no releases at all.
// matching-refs answers every `v…` tag in one unpaginated call. The page sorts
// and groups them; this only drops what is not shaped like a version.
let tagCache = { at: 0, tags: [] };
async function versionTags(token) {
  if (Date.now() - tagCache.at < 5 * 60_000) return tagCache.tags;
  const res = await gh(`/repos/${REPO}/git/matching-refs/tags/v`, {}, token);
  if (!res.ok) return tagCache.tags;
  const tags = (await res.json())
    .map(r => r.ref.replace(/^refs\/tags\//, ''))
    .filter(n => /^v\d+\.\d+\.\d+/.test(n));
  tagCache = { at: Date.now(), tags };
  return tags;
}

// Open pull requests, for "test a pull request". Only those whose branch is in
// this repository: a fork's branch cannot be checked out here, and the deploy
// refuses forks anyway. Cached briefly - long enough to absorb a form being
// opened and closed, short enough that a PR opened a minute ago shows up.
let pullCache = { at: 0, pulls: [] };
async function openPulls(token) {
  if (Date.now() - pullCache.at < 60_000) return pullCache.pulls;
  const res = await gh(`/repos/${REPO}/pulls?state=open&sort=updated&direction=desc&per_page=100`, {}, token);
  if (!res.ok) return pullCache.pulls;
  const pulls = (await res.json())
    .filter(p => p.head?.repo?.full_name === REPO)
    .map(p => ({
      number: p.number,
      title: p.title,
      branch: p.head.ref,
      author: p.user?.login || null,
      draft: Boolean(p.draft),
    }));
  pullCache = { at: Date.now(), pulls };
  return pulls;
}

// ---------------------------------------------------------------------------
// What GitHub knows about each deployment
// ---------------------------------------------------------------------------
//
// Moved here from snapshot.mjs, so that it runs with a viewer's token rather
// than one kept on the box. `token` is threaded through to every call: it is
// whoever's request happened to start this round.

// Commit metadata is immutable, so its cache never expires - which matters more
// than it looks: `develop` holds one sha for as long as nothing merges, so the
// steady state costs no commit lookups at all. The other two describe a moving
// target and are re-read on the enrichment clock.
const commitCache = new Map();
const headCache = new Map();
const compareCache = new Map();

/** A GET that answers null rather than throwing: every caller has a blank to show instead. */
async function ghRead(path, token) {
  if (!token || !REPO) return null;
  let res;
  try {
    res = await gh(path, {}, token);
  } catch (e) {
    log(`github ${path} failed: ${e.message}`);
    return null;
  }

  // A 404 is an ordinary answer here, not a failure: a deployment that has
  // never had a GitHub deployment record, or a branch that has since been
  // deleted out from under a deployment still following it.
  if (res.status === 404) return null;
  if (!res.ok) {
    log(`github ${path} -> ${res.status}`);
    return null;
  }
  return res.json();
}

const fresh = (entry, ttl) => entry && Date.now() - entry.at < ttl;

async function commitMeta(sha, token) {
  if (commitCache.has(sha)) return commitCache.get(sha);
  const data = await ghRead(`/repos/${REPO}/commits/${sha}`, token);
  const meta = data && {
    sha: data.sha,
    // First line only. A merge commit's body is the PR description, which is
    // not what belongs on a one-line row.
    subject: (data.commit?.message || '').split('\n')[0],
    author: data.author?.login || data.commit?.author?.name || null,
    date: data.commit?.author?.date || null,
    url: data.html_url,
  };
  // Cache the miss too, so a sha that is not in the repo (a force-pushed branch,
  // a deployment older than a history rewrite) is not re-asked every minute.
  commitCache.set(sha, meta);
  return meta;
}

async function branchHead(branch, token) {
  const hit = headCache.get(branch);
  if (fresh(hit, ENRICH_EVERY)) return hit.sha;
  const data = await ghRead(`/repos/${REPO}/commits/${encodeURIComponent(branch)}`, token);
  const sha = data?.sha || null;
  headCache.set(branch, { sha, at: Date.now() });
  return sha;
}

/**
 * How many commits this deployment is behind the branch it follows.
 *
 * `compare/base...head` reports `ahead_by` as the commits in head that are not
 * in base, so with the deployed commit as base that number IS how far behind
 * the deployment is. Keyed on the pair, so it is re-asked only when one of them
 * moves - which is the point: on a quiet afternoon this costs nothing.
 */
async function behindBy(deployed, head, token) {
  if (!deployed || !head) return null;
  if (deployed === head || head.startsWith(deployed)) return { behind: 0, url: null };
  const key = `${deployed}...${head}`;
  const hit = compareCache.get(key);
  if (fresh(hit, ENRICH_EVERY)) return hit.value;
  const data = await ghRead(`/repos/${REPO}/compare/${key}`, token);
  const value = data ? { behind: data.ahead_by, url: data.html_url } : null;
  compareCache.set(key, { value, at: Date.now() });
  return value;
}

/**
 * Whether a deploy is in flight for this deployment, and for which commit.
 *
 * This is the question the page exists to answer - "my PR merged, is it up
 * yet?" - and it is answerable only because docker-deploy.yaml already declares
 * `environment: ${{ inputs.environment }}`, which makes GitHub keep a
 * deployment record per environment name. The environment name is the container
 * name, so the join needs nothing invented.
 *
 * Two calls: the newest record, then its newest status. GitHub marks superseded
 * records `inactive` on its own, so the newest record is always the live one.
 */
async function deployState(name, token) {
  const records = await ghRead(
    `/repos/${REPO}/deployments?environment=${encodeURIComponent(name)}&per_page=1`,
    token,
  );
  const record = records?.[0];
  if (!record) return null;
  const statuses = await ghRead(`/repos/${REPO}/deployments/${record.id}/statuses?per_page=1`, token);
  const status = statuses?.[0];
  return {
    sha: record.sha,
    at: status?.created_at || record.created_at,
    state: status?.state || 'unknown',
    inFlight: status?.state === 'in_progress' || status?.state === 'queued',
    // `log_url` is the workflow run; `target_url` is the environment URL.
    runUrl: status?.log_url || null,
  };
}

/**
 * Everything GitHub knows about a deployment, held between enrichment ticks.
 *
 * This exists because the two clocks differ: docker is re-read every 15s and
 * GitHub every 60s, so three ticks in four have no fresh GitHub answer. Without
 * somewhere to keep the last one, those ticks publish nulls and the page's
 * GitHub-derived fields blink out - and the field that blinks is `deploy`,
 * which carries "deploying now". Losing THAT for 45 seconds at a time is
 * losing the one thing a person watching this page is watching it for.
 */
const enriched = new Map();

async function enrich(deployments, token) {
  for (const d of deployments) {
    // Sequential, deliberately. A dozen deployments is a handful of requests and
    // the loop has a whole tick to finish in; firing them all at once is how a
    // secondary-rate-limit lands, which costs far more than the latency saved.
    const e = { sha: d.sha, commit: null, branchHead: null, behind: null, compareUrl: null, deploy: null };
    if (d.sha) e.commit = await commitMeta(d.sha, token);
    if (d.branch) {
      e.branchHead = await branchHead(d.branch, token);
      const cmp = await behindBy(d.sha, e.branchHead, token);
      e.behind = cmp?.behind ?? null;
      e.compareUrl = cmp?.url ?? null;
    }
    e.deploy = await deployState(d.name, token);
    enriched.set(d.name, e);
  }

  // Forget deployments that have gone, so a box that churns previews does not
  // grow this map without bound.
  const live = new Set(deployments.map(d => d.name));
  for (const name of enriched.keys()) if (!live.has(name)) enriched.delete(name);
}

/**
 * Merge the held enrichment onto a freshly read container list.
 *
 * The `sha` guard is the important line. If a redeploy landed between
 * enrichment ticks the container is on a new commit, and the held commit
 * message and "behind" count describe the OLD one - so they are dropped rather
 * than shown. A blank for a few seconds is a much better answer than the
 * previous commit's subject to "which commit is on this?".
 *
 * `deploy` is not guarded, because it is keyed on the environment rather than
 * on a commit and stays true across a redeploy.
 */
function applyEnrichment(list) {
  for (const d of list) {
    const e = enriched.get(d.name);
    if (!e) continue;
    if (e.sha === d.sha) {
      d.commit = e.commit;
      d.behind = e.behind;
      d.compareUrl = e.compareUrl;
      d.branchHead = e.branchHead;
    }
    d.deploy = e.deploy;
  }
}

let enriching = null;
let lastEnrich = 0;
// Held between rounds so a GitHub blip does not blank the columns it fills; the
// page shows the enrichment's own age rather than pretending it is current.
let enrichedAt = null;

/**
 * Start a round of enrichment with this viewer's token, if one is due and none
 * is running. Not awaited: a dozen deployments is a few seconds of sequential
 * calls, and the page should not wait on them - it shows what is held, and the
 * next poll picks up the rest.
 */
function maybeEnrich(list, token) {
  if (enriching || Date.now() - lastEnrich < ENRICH_EVERY) return;
  // Advanced before the round, so a GitHub outage is retried on the clock
  // rather than on every poll from every open tab.
  lastEnrich = Date.now();
  enriching = enrich(list, token)
    .then(() => { enrichedAt = new Date().toISOString(); })
    .catch(e => log(`github enrichment failed: ${e.message}`))
    .finally(() => { enriching = null; });
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------
//
// GitHub's web application flow: send the browser to GitHub with a random
// `state`, GitHub sends it back with a `code`, swap the code for a token. The
// `state` is held in a short-lived cookie and must come back unchanged, which
// is what stops someone else's code being planted in your browser.

const SESSION_COOKIE = 'oms_dash_session';
const STATE_COOKIE = 'oms_dash_state';
// GitHub App user tokens last 8 hours unless the App has expiry turned off, in
// which case this caps the session instead. There is no refresh: signing in
// again once a working day is cheaper than holding refresh tokens.
const MAX_SESSION_SECONDS = 12 * 3600;

/** sid -> { token, login, canWrite, expiresAt } */
const sessions = new Map();

function readCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

function baseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return `${proto}://${req.headers.host}`;
}

function setCookie(req, name, value, maxAge) {
  // Secure whenever the page is on https, which it always is behind the proxy;
  // left off on plain http so it can be tried on localhost.
  const secure = baseUrl(req).startsWith('https:') ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function sessionOf(req) {
  const sid = readCookies(req)[SESSION_COOKIE];
  const s = sid && sessions.get(sid);
  if (!s) return null;
  if (s.expiresAt <= Date.now()) {
    sessions.delete(sid);
    return null;
  }
  return { sid, ...s };
}

// Expired sessions are also dropped on sight, above; this catches the ones
// nobody comes back for.
setInterval(() => {
  for (const [sid, s] of sessions) if (s.expiresAt <= Date.now()) sessions.delete(sid);
}, 60 * 60_000).unref();

function redirect(res, location, cookies = []) {
  res.writeHead(302, { location, 'cache-control': 'no-store', 'set-cookie': cookies });
  res.end();
}

function signIn(req, res) {
  const state = randomBytes(16).toString('hex');
  const q = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${baseUrl(req)}/auth/callback`,
    state,
  });
  return redirect(res, `${WEB}/login/oauth/authorize?${q}`, [setCookie(req, STATE_COOKIE, state, 600)]);
}

async function signInCallback(req, res, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const clearState = setCookie(req, STATE_COOKIE, '', 0);
  if (!code || !state || state !== readCookies(req)[STATE_COOKIE]) {
    // Most often a sign-in started in another tab, or one left for over ten
    // minutes. Starting again is the fix either way.
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8', 'set-cookie': clearState });
    return res.end('That sign-in did not match one started here. Go back to the dashboard and sign in again.');
  }

  const swap = await fetch(`${WEB}/login/oauth/access_token`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: `${baseUrl(req)}/auth/callback`,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const t = await swap.json().catch(() => ({}));
  if (!t.access_token) {
    log(`sign-in failed: ${t.error || swap.status} ${t.error_description || ''}`);
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'set-cookie': clearState });
    return res.end(`GitHub did not complete the sign-in: ${t.error_description || t.error || swap.status}`);
  }

  const me = await gh('/user', {}, t.access_token);
  const login = me.ok ? (await me.json()).login : null;
  if (!login) {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'set-cookie': clearState });
    return res.end('Signed in, but GitHub would not say who you are. Try again.');
  }

  // The gate. Anyone with a GitHub account can authorize the App, so the
  // question is whether GitHub will show THIS person the repository. A 404 is
  // its answer for "no" on a private one.
  const repo = await gh(`/repos/${REPO}`, {}, t.access_token);
  if (!repo.ok) {
    log(`sign-in refused: ${login} cannot see ${REPO} (${repo.status})`);
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'set-cookie': clearState });
    return res.end(`Signed in as ${login}, but that account cannot see ${REPO}, so there is nothing here for it.`);
  }
  const p = (await repo.json()).permissions || {};
  const canWrite = Boolean(p.push || p.maintain || p.admin);

  const seconds = Math.min(Number(t.expires_in) || MAX_SESSION_SECONDS, MAX_SESSION_SECONDS);
  const sid = randomBytes(32).toString('base64url');
  sessions.set(sid, { token: t.access_token, login, canWrite, expiresAt: Date.now() + seconds * 1000 });
  log(`signed in: ${login}${canWrite ? '' : ' (read only)'}`);
  return redirect(res, '/', [clearState, setCookie(req, SESSION_COOKIE, sid, seconds)]);
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 16_384) throw new Error('Request too large.');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/** See "REQUESTS FROM OTHER PAGES" in the header. */
function fromThePage(req) {
  if (req.headers['x-dashboard'] !== '1') return false;
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://dashboard');

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return send(res, 200, await readFile(join(ROOT, 'index.html')), 'text/html; charset=utf-8');
  }
  if (req.method === 'GET' && url.pathname === '/api/config') {
    const s = sessionOf(req);
    return send(res, 200, {
      signIn: CAN_SIGN_IN,
      user: s?.login || null,
      canWrite: Boolean(s?.canWrite),
      repo: REPO || null,
      ref: DISPATCH_REF,
    });
  }
  // Everything from here on is for signed-in people only.
  if (req.method === 'GET' && url.pathname === '/api/deployments') {
    const s = sessionOf(req);
    if (!s) return send(res, 401, { error: 'Sign in with GitHub first.', signIn: true });
    let snapshot;
    try {
      snapshot = JSON.parse(await readFile(SNAPSHOT, 'utf8'));
    } catch {
      return send(res, 404, { error: 'no snapshot yet' });
    }
    maybeEnrich(snapshot.deployments, s.token);
    applyEnrichment(snapshot.deployments);
    return send(res, 200, { ...snapshot, repo: REPO, enrichedAt });
  }
  if (req.method === 'GET' && url.pathname === '/api/tags') {
    const s = sessionOf(req);
    if (!s) return send(res, 401, { error: 'Sign in with GitHub first.', signIn: true });
    return send(res, 200, { tags: await versionTags(s.token).catch(() => []) });
  }
  if (req.method === 'GET' && url.pathname === '/api/pulls') {
    const s = sessionOf(req);
    if (!s) return send(res, 401, { error: 'Sign in with GitHub first.', signIn: true });
    return send(res, 200, { pulls: await openPulls(s.token).catch(() => []) });
  }

  if (req.method === 'GET' && url.pathname === '/auth/login') {
    if (!CAN_SIGN_IN) return send(res, 404, { error: 'sign-in is not configured' });
    return signIn(req, res);
  }
  if (req.method === 'GET' && url.pathname === '/auth/callback') {
    if (!CAN_SIGN_IN) return send(res, 404, { error: 'sign-in is not configured' });
    return signInCallback(req, res, url);
  }
  if (req.method === 'POST' && url.pathname === '/auth/logout') {
    if (!fromThePage(req)) return send(res, 403, { error: 'Requests must come from the dashboard page.' });
    const s = sessionOf(req);
    if (s) sessions.delete(s.sid);
    return send(res, 200, { ok: true }, undefined, { 'set-cookie': setCookie(req, SESSION_COOKIE, '', 0) });
  }

  if (req.method === 'POST' && (url.pathname === '/api/named' || url.pathname === '/api/preview')) {
    if (!fromThePage(req)) return send(res, 403, { error: 'Requests must come from the dashboard page.' });
    if (!CAN_SIGN_IN) {
      return send(res, 503, { error: 'This dashboard has no GitHub App configured, so nobody can sign in.' });
    }
    const s = sessionOf(req);
    if (!s) return send(res, 401, { error: 'Sign in with GitHub first.', signIn: true });
    // GitHub would refuse it anyway; this says why without the round trip.
    if (!s.canWrite) return send(res, 403, { error: `You have read-only access to ${REPO}, so you cannot start servers.` });

    const kind = url.pathname === '/api/named' ? 'named' : 'preview';
    let inputs;
    try {
      const body = await readJson(req);
      inputs = kind === 'named' ? namedInputs(body) : previewInputs(body);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    try {
      const { runUrl } = await dispatch(WORKFLOWS[kind], inputs, s.token);
      // GitHub has its own record of who ran it; this line is the quick answer
      // to "who asked for what" without opening every run.
      log(`${s.login} dispatched ${WORKFLOWS[kind]} ${JSON.stringify(inputs)}`);
      return send(res, 200, { ok: true, runUrl });
    } catch (e) {
      log(`${s.login} dispatch failed: ${e.message} ${JSON.stringify(inputs)}`);
      // A revoked or expired token: drop the session so the page offers the
      // sign-in again rather than failing the same way on every click.
      if (e.status === 401) {
        sessions.delete(s.sid);
        return send(res, 401, { error: 'Your GitHub sign-in has expired. Sign in again.', signIn: true });
      }
      return send(res, 502, { error: e.message });
    }
  }

  return send(res, 404, { error: 'not found' });
}

createServer((req, res) => {
  handle(req, res).catch(e => {
    log(`request failed: ${e.stack || e.message}`);
    if (!res.headersSent) send(res, 500, { error: 'internal error' });
  });
}).listen(PORT, () => {
  log(`serving on :${PORT}${CAN_SIGN_IN ? `, sign-in on, dispatching to ${REPO}@${DISPATCH_REF}` : ' - no GitHub App configured, so nobody can sign in'}`);
});
