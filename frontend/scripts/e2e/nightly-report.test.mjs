import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// nightly-report.mjs reads the layout the workflow's download leaves behind:
// <dir>/e2e-report-<leg>/results.json for every leg, one leg or many. Run it
// as the workflow does, against real directories.
const script = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'nightly-report.mjs'
);

const report = status => ({
  stats: {
    startTime: '2026-10-05T07:50:59.631Z',
    expected: status === 'expected' ? 2 : 1,
    unexpected: status === 'unexpected' ? 1 : 0,
    skipped: 0,
    flaky: 0,
  },
  suites: [
    {
      title: 'a.spec.ts',
      file: 'a.spec.ts',
      specs: [
        { title: 'passes', file: 'a.spec.ts', tests: [{ status: 'expected' }] },
        { title: 'checked', file: 'a.spec.ts', tests: [{ status }] },
      ],
    },
  ],
});

let root;
const put = (rel, json) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(json));
};
const run = env =>
  spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      RESULTS_DIR: path.join(root, 'results'),
      BASELINE_DIR: path.join(root, 'baseline'),
      ...env,
    },
  });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'nightly-report-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('nightly-report layout', () => {
  // #1133: an RC has no plugin legs, so its download matched one artifact.
  it('classifies a single-leg branch from its foldered report', () => {
    put('results/e2e-report-v3.03.00-RC/results.json', report('unexpected'));
    put('baseline/e2e-report-v3.03.00-RC/results.json', report('unexpected'));
    const r = run({ LEG_ID: 'v3.03.00-RC', LEG_IDS: 'v3.03.00-RC' });
    expect(r.stdout).not.toContain('Infra failure');
    expect(r.stdout).not.toContain('No baseline');
    expect(r.status).toBe(0);
  });

  it('classifies every leg of a multi-leg branch against its own baseline', () => {
    put('results/e2e-report-develop/results.json', report('expected'));
    put(
      'results/e2e-report-develop-plugin-example/results.json',
      report('unexpected')
    );
    put('baseline/e2e-report-develop/results.json', report('expected'));
    put(
      'baseline/e2e-report-develop-plugin-example/results.json',
      report('expected')
    );
    const r = run({
      LEG_ID: 'develop',
      LEG_IDS: 'develop,develop-plugin-example',
    });
    expect(r.stdout).not.toContain('Infra failure');
    expect(r.stdout).toContain('[plugin-example] a.spec.ts › checked');
    expect(r.status).toBe(1);
  });

  it('names a report filed outside every leg folder as a layout mismatch, not a boot failure', () => {
    put('results/results.json', report('expected'));
    const r = run({ LEG_ID: 'v3.03.00-RC', LEG_IDS: 'v3.03.00-RC' });
    expect(r.stdout).toContain('Infra failure');
    expect(r.stdout).toContain('disagree on the layout');
    expect(r.stdout).not.toContain('boot failure?');
    expect(r.status).toBe(1);
  });

  it('still calls a leg with no report anywhere a boot failure', () => {
    const r = run({ LEG_ID: 'v3.03.00-RC', LEG_IDS: 'v3.03.00-RC' });
    expect(r.stdout).toContain('boot failure?');
    expect(r.status).toBe(1);
  });

  // An old flat baseline after the switch: one night with no baseline.
  it('treats a flat baseline as no baseline rather than failing', () => {
    put('results/e2e-report-v3.03.00-RC/results.json', report('expected'));
    put('baseline/results.json', report('expected'));
    const r = run({ LEG_ID: 'v3.03.00-RC', LEG_IDS: 'v3.03.00-RC' });
    expect(r.stdout).toContain('No baseline');
    expect(r.stdout).not.toContain('Infra failure');
    expect(r.status).toBe(0);
  });
});
