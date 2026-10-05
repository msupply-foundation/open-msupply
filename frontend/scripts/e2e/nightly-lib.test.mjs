/* eslint-disable camelcase -- the GitHub REST API's field names. */
import { describe, expect, it, vi } from 'vitest';
import { crc32, deflateRawSync } from 'node:zlib';
import {
  cluesMarkdown,
  earlierIssuesFor,
  gatherClues,
  historyLine,
  legKey,
  planIssue,
  readZipEntry,
  regressedKeysInBody,
  relatedCommits,
  setFromBody,
  setMarker,
  specFileOf,
  splitLegKey,
  syncTrackingIssue,
  testsFromReport,
} from './nightly-lib.mjs';

/**
 * A zip in the shape upload-artifact streams: sizes left out of each local
 * header (flag bit 3) and carried only by the data descriptor and the central
 * directory — the case a local-header reader gets wrong.
 */
const streamedZip = (files, deflate = true) => {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text);
    const data = deflate ? deflateRawSync(raw) : raw;
    const nameBuf = Buffer.from(name);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 6); // sizes in the data descriptor
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt16LE(nameBuf.length, 26);
    const descriptor = Buffer.alloc(16);
    descriptor.writeUInt32LE(0x08074b50, 0);
    descriptor.writeUInt32LE(crc, 4);
    descriptor.writeUInt32LE(data.length, 8);
    descriptor.writeUInt32LE(raw.length, 12);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 8);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data, descriptor);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length + 16;
  }
  const dir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, eocd]);
};

describe('readZipEntry', () => {
  it('reads a deflated entry whose sizes are only in the central directory', () => {
    const zip = streamedZip({ 'a.txt': 'first', 'results.json': '{"ok":1}' });
    expect(readZipEntry(zip, 'results.json')?.toString()).toBe('{"ok":1}');
  });
  it('reads a stored entry', () => {
    const zip = streamedZip({ 'results.json': 'plain' }, false);
    expect(readZipEntry(zip, 'results.json')?.toString()).toBe('plain');
  });
  it('returns null for a missing entry or a non-zip', () => {
    expect(
      readZipEntry(streamedZip({ 'a.txt': 'x' }), 'results.json')
    ).toBeNull();
    expect(
      readZipEntry(Buffer.from('not a zip at all, honestly'), 'x')
    ).toBeNull();
  });
});

describe('testsFromReport', () => {
  it('keys tests by file and describe chain, and keeps the last attempt’s first error line', () => {
    const report = {
      suites: [
        {
          title: 'a.spec.ts',
          file: 'a.spec.ts',
          suites: [
            {
              title: 'Group',
              file: 'a.spec.ts',
              specs: [
                {
                  title: 'does it',
                  file: 'a.spec.ts',
                  tests: [
                    {
                      status: 'unexpected',
                      results: [
                        { errors: [{ message: 'first try' }] },
                        {
                          errors: [
                            { message: '\u001b[31mboom\u001b[0m\nstack' },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(testsFromReport(report).get('a.spec.ts › Group › does it')).toEqual({
      outcome: 'unexpected',
      error: 'boom',
    });
  });
});

describe('historyLine', () => {
  it('calls a test that failed or retried before intermittent', () => {
    const line = historyLine(
      ['expected', 'unexpected', 'flaky', undefined],
      'unexpected'
    );
    expect(line).toContain('`✅❌⚠️·` → ❌');
    expect(line).toContain(
      'failed 1 of the previous 3 runs, passed on retry in 1'
    );
    expect(line).toContain('likely intermittent');
  });
  it('calls an all-green history a first failure', () => {
    expect(historyLine(['expected', 'expected'], 'unexpected')).toContain(
      'first failure in this window'
    );
  });
  it('says so when no earlier run has the test', () => {
    expect(historyLine([undefined, undefined], 'unexpected')).toContain(
      'no earlier runs'
    );
  });
});

describe('relatedCommits', () => {
  const commits = [
    { sha: 'a1', message: 'app', files: ['frontend/src/x.tsx'] },
    { sha: 'b2', message: 'spec', files: ['frontend/e2e/specs/dash.spec.ts'] },
    {
      sha: 'c3',
      message: 'other spec',
      files: ['frontend/e2e/specs/other.spec.ts'],
    },
    {
      sha: 'd4',
      message: 'data',
      files: ['server/data/e2e/export.json', 'README.md'],
    },
  ];
  it('keeps commits touching the spec itself or the shared suite support', () => {
    const hits = relatedCommits(commits, 'dash.spec.ts');
    expect(hits.map(h => h.sha)).toEqual(['b2', 'd4']);
    expect(hits[1].touched).toEqual(['server/data/e2e/export.json']);
  });
});

describe('issue markers', () => {
  it('round-trips the regression set, sorted', () => {
    expect(setFromBody(`x\n${setMarker(['b', 'a'])}\ny`)).toEqual(['a', 'b']);
    expect(setFromBody('no marker')).toBeNull();
  });
  it('reads regressions from an older issue’s report, not its every-test table', () => {
    const body = [
      '### ❌ develop — regressions, passed in the baseline, failing now (1)',
      '',
      '- `a.spec.ts › real regression` — Error: x',
      '',
      '### Every test not green (2)',
      '| `b.spec.ts › only pre-existing` | ⏳ pre-existing |',
    ].join('\n');
    expect(regressedKeysInBody(body)).toEqual(['a.spec.ts › real regression']);
    expect(
      earlierIssuesFor([{ number: 1, body }], 'b.spec.ts › only pre-existing')
    ).toEqual([]);
  });
});

describe('planIssue', () => {
  const open = { number: 7, body: setMarker(['a', 'b']) };
  it('opens an issue on the first red, closes it on green, ignores green with none open', () => {
    expect(
      planIssue({ outcome: 'failure', open: undefined, keys: ['a'] })
    ).toEqual({
      action: 'create',
    });
    expect(planIssue({ outcome: 'success', open, keys: [] })).toEqual({
      action: 'close',
    });
    expect(
      planIssue({ outcome: 'success', open: undefined, keys: [] })
    ).toEqual({
      action: 'none',
    });
  });
  it('compares against an older issue’s report when it has no set marker', () => {
    const legacy = {
      number: 4,
      body: '### ❌ d — regressions, passed in the baseline, failing now (1)\n\n- `a` — Error\n',
    };
    expect(
      planIssue({ outcome: 'failure', open: legacy, keys: ['a'] })
    ).toEqual({
      action: 'update',
      added: [],
      removed: [],
    });
  });
  it('reports which regressions were added and removed while red', () => {
    expect(planIssue({ outcome: 'failure', open, keys: ['b', 'c'] })).toEqual({
      action: 'update',
      added: ['c'],
      removed: ['a'],
    });
    expect(planIssue({ outcome: 'failure', open, keys: ['b', 'a'] })).toEqual({
      action: 'update',
      added: [],
      removed: [],
    });
  });
});

describe('syncTrackingIssue', () => {
  const fakeGithub = ({ open = [], closed = [] } = {}) => {
    const github = {
      paginate: vi.fn(async (_fn, { state }) =>
        state === 'open' ? open : closed
      ),
      rest: {
        issues: {
          listForRepo: vi.fn(),
          create: vi.fn(async () => ({ data: { number: 99 } })),
          update: vi.fn(async () => ({})),
          createComment: vi.fn(async () => ({})),
        },
      },
    };
    return github;
  };
  const base = {
    owner: 'o',
    repo: 'r',
    key: 'develop',
    tag: 't1',
    runUrl: 'https://run',
    report: 'REPORT',
  };
  const summary = { infra: false, regressions: [{ key: 'a.spec.ts › x' }] };

  it('creates a fresh issue that links the previous streak', async () => {
    const github = fakeGithub({
      closed: [
        {
          number: 3,
          closed_at: '2026-09-01',
          body: '<!-- e2e-nightly-regression:develop -->',
        },
        {
          number: 5,
          closed_at: '2026-09-20',
          body: '<!-- e2e-nightly-regression:develop -->',
        },
        {
          number: 6,
          closed_at: '2026-09-25',
          body: '<!-- e2e-nightly-regression:v3-RC -->',
        },
      ],
    });
    const res = await syncTrackingIssue({
      ...base,
      github,
      outcome: 'failure',
      summary,
    });
    expect(res).toEqual({ action: 'create', number: 99 });
    const { body, labels } = github.rest.issues.create.mock.calls[0][0];
    expect(labels).toEqual(['e2e-nightly']);
    expect(body).toContain('Previous streak on `develop`: #5.');
    expect(setFromBody(body)).toEqual(['a.spec.ts › x']);
    expect(body).toContain('REPORT');
  });

  it('updates the body every red night but comments only when the set changes', async () => {
    const same = fakeGithub({
      open: [
        {
          number: 8,
          body: `<!-- e2e-nightly-regression:develop -->\n${setMarker(['a.spec.ts › x'])}`,
        },
      ],
    });
    await syncTrackingIssue({
      ...base,
      github: same,
      outcome: 'failure',
      summary,
    });
    expect(same.rest.issues.update).toHaveBeenCalledTimes(1);
    expect(same.rest.issues.createComment).not.toHaveBeenCalled();

    const changed = fakeGithub({
      open: [
        {
          number: 8,
          body: `<!-- e2e-nightly-regression:develop -->\n${setMarker(['old'])}`,
        },
      ],
    });
    await syncTrackingIssue({
      ...base,
      github: changed,
      outcome: 'failure',
      summary,
    });
    const comment = changed.rest.issues.createComment.mock.calls[0][0].body;
    expect(comment).toContain('➕ `a.spec.ts › x`');
    expect(comment).toContain('➖ `old`');
  });

  it('closes the open issue on a green run, and leaves another branch’s alone', async () => {
    const github = fakeGithub({
      open: [
        { number: 9, body: '<!-- e2e-nightly-regression:v3-RC -->' },
        { number: 8, body: '<!-- e2e-nightly-regression:develop -->' },
      ],
    });
    const res = await syncTrackingIssue({
      ...base,
      github,
      outcome: 'success',
      summary: null,
    });
    expect(res).toEqual({ action: 'close', number: 8 });
    expect(github.rest.issues.update).toHaveBeenCalledWith(
      expect.objectContaining({ issue_number: 8, state: 'closed' })
    );
  });

  it('treats a red run with no summary as an infra failure', async () => {
    const github = fakeGithub();
    await syncTrackingIssue({
      ...base,
      github,
      outcome: 'failure',
      summary: null,
    });
    expect(
      setFromBody(github.rest.issues.create.mock.calls[0][0].body)
    ).toEqual(['(infra failure)']);
  });

  it('tracks an infra failure as its own regression entry', async () => {
    const github = fakeGithub();
    await syncTrackingIssue({
      ...base,
      github,
      outcome: 'failure',
      summary: { infra: true, regressions: [] },
    });
    expect(
      setFromBody(github.rest.issues.create.mock.calls[0][0].body)
    ).toEqual(['(infra failure)']);
  });
});

describe('cluesMarkdown', () => {
  it('lists history, earlier issues and related commits per regression', () => {
    const key = 'dash.spec.ts › shows it';
    const md = cluesMarkdown({
      regressions: [{ key }],
      history: new Map([[key, ['expected', 'expected']]]),
      commits: [
        {
          sha: 'c548e547da00',
          message: 'test(e2e): seed\n\nbody',
          files: ['server/data/e2e/export.json'],
        },
        { sha: 'f00', message: 'app', files: ['frontend/src/a.ts'] },
      ],
      compareUrl: 'https://cmp',
      earlier: new Map([
        [
          key,
          [
            {
              number: 1061,
              closed_at: '2026-10-01T00:00:00Z',
              body: '<!-- e2e-nightly-regression:develop -->',
            },
          ],
        ],
      ]),
    });
    expect(md).toContain(
      '[2 commits](https://cmp) — 1 touch `frontend/src`, 0 touch the server'
    );
    expect(md).toContain('first failure in this window');
    expect(md).toContain('#1061 (`develop`, closed 2026-10-01)');
    expect(md).toContain(
      'c548e547da test(e2e): seed — `server/data/e2e/export.json`'
    );
  });
  it('says when nothing in the range touches the suite', () => {
    const key = 'x.spec.ts › y';
    const md = cluesMarkdown({
      regressions: [{ key }],
      history: new Map(),
      commits: [],
      compareUrl: null,
      earlier: new Map(),
    });
    expect(md).toContain('No commit in the range touches this spec');
  });
});

describe('leg-qualified keys', () => {
  it('leaves the default leg bare and prefixes any other', () => {
    expect(legKey(null, 'auth.setup.ts › Auth')).toBe('auth.setup.ts › Auth');
    expect(legKey('plugin-cook_islands', 'auth.setup.ts › Auth')).toBe(
      '[plugin-cook_islands] auth.setup.ts › Auth'
    );
  });
  it('splits a qualified key back, and passes a bare one through', () => {
    expect(splitLegKey('[plugin-cook_islands] a.spec.ts › t')).toEqual({
      leg: 'plugin-cook_islands',
      key: 'a.spec.ts › t',
    });
    expect(splitLegKey('a.spec.ts › t')).toEqual({
      leg: null,
      key: 'a.spec.ts › t',
    });
  });
  it('finds the spec file under the leg prefix', () => {
    expect(
      specFileOf('[plugin-cook_islands] plugins/cook_islands/ck.spec.ts › gate')
    ).toBe('plugins/cook_islands/ck.spec.ts');
  });
});

describe('gatherClues', () => {
  // One previous run carrying both legs' reports, in which the SAME setup
  // test passed on the default leg and failed on the plugin leg — so a
  // history read from the wrong leg's report reads the wrong outcome.
  const report = status => ({
    suites: [
      {
        title: 'auth.setup.ts',
        file: 'auth.setup.ts',
        specs: [{ title: 'Auth', file: 'auth.setup.ts', tests: [{ status }] }],
      },
    ],
  });
  const artifacts = {
    'e2e-report-develop': report('expected'),
    'e2e-report-develop-plugin-cook_islands': report('unexpected'),
  };
  const ids = Object.keys(artifacts);
  const github = {
    rest: {
      actions: {
        listWorkflowRuns: async () => ({
          data: { workflow_runs: [{ id: 1 }, { id: 2 }] },
        }),
        listWorkflowRunArtifacts: async ({ run_id }) => ({
          data: {
            artifacts:
              run_id === 1
                ? ids.map((name, id) => ({ id, name, expired: false }))
                : [],
          },
        }),
        downloadArtifact: async ({ artifact_id }) => ({
          data: streamedZip({
            'results.json': JSON.stringify(artifacts[ids[artifact_id]]),
          }),
        }),
      },
      repos: {},
      issues: { listForRepo: async () => ({ data: [] }) },
    },
    paginate: async () => [],
  };

  it("reads each regression's history from its own leg's report", async () => {
    const md = await gatherClues({
      github,
      owner: 'o',
      repo: 'r',
      key: 'develop',
      currentRunId: 2,
      summary: {
        regressions: [
          { key: 'auth.setup.ts › Auth' },
          { key: '[plugin-cook_islands] auth.setup.ts › Auth' },
        ],
      },
      serverUrl: 'https://gh',
    });
    const [, bare, plugin] = md.split(/\*\*`/);
    expect(bare).toContain('first failure in this window');
    expect(plugin).toContain('has failed before');
  });
});
