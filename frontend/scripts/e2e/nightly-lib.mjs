/* eslint-disable camelcase -- the GitHub REST API's field names. */
// Shared by the nightly e2e workflow's Report job: nightly-report.mjs (the
// classification) and the two actions/github-script steps after it (the clues
// and the tracking issue). Kept in one module so the test keys the report
// classifies by are the same keys the history and the issue match on, and so
// the parts with logic in them are unit-tested (nightly-lib.test.ts) rather
// than living untested in workflow YAML.

import { inflateRawSync } from 'node:zlib';

// ─── Reading a Playwright report ─────────────────────────────────────────────

/**
 * Map of "file › describe › … › title" → { outcome, error } for one
 * results.json. The describe chain matters: the same leaf title recurs across
 * groups in one file (e.g. "list view renders core controls").
 */
export const testsFromReport = report => {
  const tests = new Map();
  const walk = (suite, ancestors) => {
    // The file-level suite's title is the file path itself — the spec's
    // `file` field already carries it, so only real describe titles nest.
    const chain =
      suite.title && suite.title !== suite.file
        ? [...ancestors, suite.title]
        : ancestors;
    for (const child of suite.suites ?? []) walk(child, chain);
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const lastRun = t.results?.[t.results.length - 1];
        tests.set([spec.file, ...chain, spec.title].join(' › '), {
          // expected | unexpected | flaky | skipped
          outcome: t.status,
          // First line only, ANSI color codes stripped — it lands in markdown.
          error:
            lastRun?.errors?.[0]?.message
              // eslint-disable-next-line no-control-regex -- matching ESC is the point
              ?.replace(/\u001b\[[0-9;]*m/g, '')
              .split('\n')[0] ?? '',
        });
      }
    }
  };
  for (const s of report.suites ?? []) walk(s, []);
  return tests;
};

/** The spec file a test key belongs to (its first segment). */
export const specFileOf = key => key.split(' › ')[0];

/**
 * One file out of an artifact zip, as the GitHub API serves it. Read through
 * the central directory, because upload-artifact streams its entries and so
 * leaves the sizes out of the local headers. Stored and deflated entries only
 * — the two methods a zip writer actually uses.
 */
export const readZipEntry = (buffer, name) => {
  const buf = Buffer.from(buffer);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const entries = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const entryName = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (entryName === name) {
      const start =
        local +
        30 +
        buf.readUInt16LE(local + 26) +
        buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
};

// ─── Clues ───────────────────────────────────────────────────────────────────

const OUTCOME_MARK = {
  expected: '✅',
  flaky: '⚠️',
  unexpected: '❌',
  skipped: '⏭',
};

/**
 * One test's recent history, oldest first, as a strip plus a count. `outcomes`
 * is one entry per previous run (undefined = the test wasn't in that run).
 */
export const historyLine = (outcomes, now) => {
  const present = outcomes.filter(Boolean);
  if (!present.length) return '_no earlier runs carry this test_';
  const failed = present.filter(o => o === 'unexpected').length;
  const flaky = present.filter(o => o === 'flaky').length;
  const strip = outcomes
    .map(o => (o ? (OUTCOME_MARK[o] ?? '·') : '·'))
    .join('');
  const parts = [`failed ${failed} of the previous ${present.length} runs`];
  if (flaky) parts.push(`passed on retry in ${flaky}`);
  const verdict =
    failed + flaky > 0
      ? ' — **has failed before; likely intermittent**'
      : ' — first failure in this window';
  return `\`${strip}\` → ${OUTCOME_MARK[now] ?? '·'} (${parts.join(', ')})${verdict}`;
};

/**
 * Paths whose change can break a given spec without touching app code: the
 * spec itself, the shared helpers and config, and the reference datafile.
 */
const suiteSupportPaths = [
  'frontend/e2e/helpers/',
  'frontend/e2e/playwright.config.ts',
  'frontend/e2e/specs/data.setup.ts',
  'frontend/e2e/specs/auth.setup.ts',
  'server/data/e2e/',
];

/**
 * The commits in the range that touch a regressed test's own spec or the
 * shared suite support, with which of those files they touched.
 * `commits` is [{ sha, message, files: [path] }].
 */
export const relatedCommits = (commits, specFile) => {
  const own = `frontend/e2e/specs/${specFile}`;
  const hits = [];
  for (const c of commits) {
    const touched = c.files.filter(
      f => f === own || suiteSupportPaths.some(p => f.startsWith(p))
    );
    if (touched.length) hits.push({ ...c, touched });
  }
  return hits;
};

/**
 * The keys an issue body records as REGRESSIONS — not every test it mentions:
 * the "Every test not green" table names pre-existing failures too. Issues
 * written by this module carry the set marker; older ones only the report's
 * regressions section, read as a fallback.
 */
export const regressedKeysInBody = body => {
  const marked = setFromBody(body);
  if (marked) return marked;
  const text = body ?? '';
  const start = text.indexOf('regressions, passed in the baseline');
  if (start < 0) return [];
  const end = text.indexOf('\n###', start);
  const section = text.slice(start, end < 0 ? undefined : end);
  return [...section.matchAll(/^- `([^`]+)`/gm)].map(m => m[1]);
};

/** The branch an issue tracks, from its marker. */
export const branchOfBody = body =>
  (body ?? '').match(/<!-- e2e-nightly-regression:(\S+) -->/)?.[1] ?? null;

/** Earlier tracking issues (any branch) in which this test regressed. */
export const earlierIssuesFor = (issues, key) =>
  issues.filter(i => regressedKeysInBody(i.body).includes(key));

/**
 * The "🔎 Clues" markdown section. Pure: every input is already fetched.
 *   regressions  [{ key, error }]
 *   history      Map key → [outcome per previous run, oldest first]
 *   commits      [{ sha, message, files }] in baseline..current, or null
 *   compareUrl   link to the full range, or null
 *   earlier      Map key → [{ number, closed_at }]
 */
export const cluesMarkdown = ({
  regressions,
  history,
  commits,
  compareUrl,
  earlier,
}) => {
  const lines = ['### 🔎 Clues', ''];
  lines.push(
    '_Mechanical pointers, not a diagnosis — where to look first. History is this branch’s previous nightly runs, oldest first._',
    ''
  );
  if (commits) {
    const app = commits.filter(c =>
      c.files.some(f => f.startsWith('frontend/src/'))
    ).length;
    const server = commits.filter(c =>
      c.files.some(
        f => f.startsWith('server/') && !f.startsWith('server/data/')
      )
    ).length;
    const range = compareUrl
      ? `[${commits.length} commits](${compareUrl})`
      : `${commits.length} commits`;
    lines.push(
      `Since the baseline: ${range} — ${app} touch \`frontend/src\`, ${server} touch the server.`,
      ''
    );
  }
  for (const { key } of regressions) {
    lines.push(`**\`${key}\`**`, '');
    lines.push(
      `- History: ${historyLine(history.get(key) ?? [], 'unexpected')}`
    );
    const before = earlier.get(key) ?? [];
    if (before.length)
      lines.push(
        `- Also regressed in: ${before
          .map(i => {
            const branch = branchOfBody(i.body);
            const state = i.closed_at
              ? `closed ${i.closed_at.slice(0, 10)}`
              : 'open';
            return `#${i.number} (${[branch && `\`${branch}\``, state].filter(Boolean).join(', ')})`;
          })
          .join(', ')}`
      );
    if (commits) {
      const hits = relatedCommits(commits, specFileOf(key));
      if (hits.length) {
        lines.push('- Commits touching this spec or the shared suite support:');
        for (const h of hits.slice(0, 8))
          lines.push(
            `  - ${h.sha.slice(0, 10)} ${h.message.split('\n')[0]} — ${h.touched.map(f => `\`${f}\``).join(', ')}`
          );
        if (hits.length > 8) lines.push(`  - … and ${hits.length - 8} more`);
      } else {
        lines.push(
          '- No commit in the range touches this spec or the shared suite support — look at app or server changes, or at intermittency.'
        );
      }
    }
    lines.push('');
  }
  return lines.join('\n');
};

// ─── The tracking issue ──────────────────────────────────────────────────────

/** Hidden in the issue body: which branch, and which tests it is about. */
export const branchMarker = key => `<!-- e2e-nightly-regression:${key} -->`;
const SET_PREFIX = '<!-- e2e-nightly-regressions:';
export const setMarker = keys =>
  `${SET_PREFIX}${JSON.stringify([...keys].sort())} -->`;
export const setFromBody = body => {
  const i = (body ?? '').indexOf(SET_PREFIX);
  if (i < 0) return null;
  const end = body.indexOf(' -->', i);
  try {
    return JSON.parse(body.slice(i + SET_PREFIX.length, end));
  } catch {
    return null;
  }
};

/**
 * What to do with the branch's tracking issue. One issue per RED STREAK: the
 * first red run after a green one opens it, red runs keep its body current
 * (commenting only when the set of regressions changes), and the next green
 * run closes it. A closed issue is never reopened — the next streak gets a
 * fresh, short issue that links back.
 *   outcome  'failure' (regression or infra) | 'success'
 *   open     the branch's open tracking issue, or undefined
 *   keys     this run's regressed test keys (infra → ['(infra failure)'])
 */
export const planIssue = ({ outcome, open, keys }) => {
  if (outcome === 'success')
    return open ? { action: 'close' } : { action: 'none' };
  if (!open) return { action: 'create' };
  // An issue filed before the set marker existed falls back to its report.
  const before = regressedKeysInBody(open.body);
  const now = [...keys].sort();
  const added = now.filter(k => !before.includes(k));
  const removed = before.filter(k => !now.includes(k));
  return { action: 'update', added, removed };
};

const listTracking = async (github, owner, repo, state) =>
  github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state,
    labels: 'e2e-nightly',
    per_page: 100,
  });

/**
 * The tracking-issue step. `summary` is nightly-report.mjs's report.json (or
 * null when it never ran); `report` is report.md with any clues appended.
 */
export const syncTrackingIssue = async ({
  github,
  owner,
  repo,
  key,
  tag,
  runUrl,
  outcome,
  summary,
  report,
}) => {
  const marker = branchMarker(key);
  const open = (await listTracking(github, owner, repo, 'open')).find(
    i => !i.pull_request && (i.body ?? '').includes(marker)
  );
  // No summary at all means the report container never ran — on a red run
  // that is an infra failure, not an empty set of regressions.
  const keys =
    !summary || summary.infra
      ? ['(infra failure)']
      : summary.regressions.map(r => r.key);
  const plan = planIssue({ outcome, open, keys });

  if (plan.action === 'none') return plan;
  if (plan.action === 'close') {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: open.number,
      body: `✅ Green on [this run](${runUrl}) (\`${tag}\`) — closing. A new issue opens if \`${key}\` regresses again.`,
    });
    await github.rest.issues.update({
      owner,
      repo,
      issue_number: open.number,
      state: 'closed',
      state_reason: 'completed',
    });
    return { ...plan, number: open.number };
  }

  let previous = '';
  if (plan.action === 'create') {
    const closed = (await listTracking(github, owner, repo, 'closed'))
      .filter(i => !i.pull_request && (i.body ?? '').includes(marker))
      .sort((a, b) => (b.closed_at ?? '').localeCompare(a.closed_at ?? ''));
    if (closed[0])
      previous = `Previous streak on \`${key}\`: #${closed[0].number}.\n\n`;
  }
  const body =
    `${marker}\n${setMarker(keys)}\n\n` +
    `**e2e regression or infra failure on \`${key}\`** (\`${tag}\`). [View run](${runUrl})\n\n` +
    `This issue tracks one red streak: it updates on each red nightly and closes on the next green one.\n\n` +
    previous +
    report;

  if (plan.action === 'create') {
    const { data } = await github.rest.issues.create({
      owner,
      repo,
      title: `e2e regression on ${key}`,
      body,
      labels: ['e2e-nightly'],
    });
    return { ...plan, number: data.number };
  }

  await github.rest.issues.update({
    owner,
    repo,
    issue_number: open.number,
    body,
  });
  if (plan.added.length || plan.removed.length) {
    const fmt = (sign, ks) => ks.map(k => `- ${sign} \`${k}\``).join('\n');
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number: open.number,
      body: [
        `Regressions changed on [this run](${runUrl}) (\`${tag}\`):`,
        fmt('➕', plan.added),
        fmt('➖', plan.removed),
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }
  return { ...plan, number: open.number };
};

// ─── The clues step ──────────────────────────────────────────────────────────

/**
 * Fetch what the clues need and render them. Best-effort by design: the step
 * runs with continue-on-error, and any piece that fails is left out rather
 * than failing the issue.
 */
export const gatherClues = async ({
  github,
  owner,
  repo,
  key,
  currentRunId,
  summary,
  serverUrl,
  historyRuns = 10,
  log = () => {},
}) => {
  const regressions = summary?.regressions ?? [];
  if (!regressions.length) return '';
  const wanted = `e2e-report-${key}`;

  // History: this branch's previous runs, any conclusion — green nights are
  // exactly what tells a flaky test from a broken one.
  const history = new Map(regressions.map(r => [r.key, []]));
  try {
    const { data } = await github.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: 'frontend-e2e-nightly.yaml',
      status: 'completed',
      per_page: 100,
    });
    const found = [];
    for (const run of data.workflow_runs) {
      if (found.length >= historyRuns) break;
      if (run.id === currentRunId) continue;
      const arts = await github.rest.actions.listWorkflowRunArtifacts({
        owner,
        repo,
        run_id: run.id,
        per_page: 100,
      });
      const art = arts.data.artifacts.find(
        a => a.name === wanted && !a.expired
      );
      if (!art) continue;
      const zip = await github.rest.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: art.id,
        archive_format: 'zip',
      });
      const json = readZipEntry(zip.data, 'results.json');
      if (!json) continue;
      found.push(testsFromReport(JSON.parse(json.toString('utf8'))));
    }
    found.reverse(); // oldest first
    for (const r of regressions)
      history.set(
        r.key,
        found.map(tests => tests.get(r.key)?.outcome)
      );
  } catch (e) {
    log(`history skipped: ${e.message}`);
  }

  // Commits in baseline..current, with the files each one touched.
  let commits = null;
  let compareUrl = null;
  if (summary.baselineCommit && summary.commit) {
    try {
      const { data } = await github.rest.repos.compareCommitsWithBasehead({
        owner,
        repo,
        basehead: `${summary.baselineCommit}...${summary.commit}`,
        per_page: 100,
      });
      compareUrl = `${serverUrl}/${owner}/${repo}/compare/${summary.baselineCommit.slice(0, 12)}...${summary.commit.slice(0, 12)}`;
      commits = [];
      for (const c of data.commits.slice(-100)) {
        if (c.parents.length > 1) continue; // merges repeat their commits' files
        const { data: full } = await github.rest.repos.getCommit({
          owner,
          repo,
          ref: c.sha,
          per_page: 300,
        });
        commits.push({
          sha: c.sha,
          message: c.commit.message,
          files: (full.files ?? []).map(f => f.filename),
        });
      }
    } catch (e) {
      log(`commit range skipped: ${e.message}`);
      commits = null;
    }
  }

  // Earlier tracking issues that named the same test — the flapping signal
  // that one-issue-per-streak would otherwise scatter.
  const earlier = new Map();
  try {
    const closed = await listTracking(github, owner, repo, 'closed');
    for (const r of regressions)
      earlier.set(r.key, earlierIssuesFor(closed, r.key).slice(0, 5));
  } catch (e) {
    log(`earlier issues skipped: ${e.message}`);
  }

  return cluesMarkdown({ regressions, history, commits, compareUrl, earlier });
};
