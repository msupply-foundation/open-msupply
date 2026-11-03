import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  scopeOf,
  specFolders,
  specVerticals,
  stem,
} from './spec-verticals.mjs';

const FULL = '> **Scope: full stack.** Specifies the whole area.';
const FRONT = '> **Scope: front end.** Specifies the front end.';

/** A spec/ folder holding `files`; returns its path. */
const fakeSpec = files => {
  const root = mkdtempSync(join(tmpdir(), 'spec-verticals-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
};

const summary = folders =>
  folders.map(({ name, readme, scope }) => ({ name, readme, scope }));

describe('scopeOf', () => {
  it('reads the scope line under the heading', () => {
    expect(scopeOf(`# Procurement\n\n${FULL}\n`)).toBe('full stack');
    expect(scopeOf(`# Stocktakes\n\n${FRONT}\n`)).toBe('front end');
    expect(scopeOf(`# Procurement\n\nIntro.\n\n${FULL}\n`)).toBeNull();
    expect(scopeOf(`Procurement\n\n${FULL}\n`)).toBeNull();
  });
});

describe('stem', () => {
  it('turns a nested name into one path segment', () => {
    expect(stem('procurement/plan')).toBe('procurement-plan');
    expect(stem('stocktakes')).toBe('stocktakes');
  });
});

describe('specFolders', () => {
  it('finds verticals at any depth, named by their path under spec/', () => {
    const dir = fakeSpec({
      'stocktakes/README.md': `# Stocktakes\n\n${FRONT}\n`,
      'procurement/README.md': `# Procurement\n\n${FULL}\n`,
      'procurement/plan/README.md': `# Plan\n\n${FULL}\n`,
      'procurement/plan/cases/OMS-REG-PRCM-PLN-01.md': '---\n',
    });
    expect(summary(specVerticals(dir))).toEqual([
      { name: 'procurement', readme: true, scope: 'full stack' },
      { name: 'procurement/plan', readme: true, scope: 'full stack' },
      { name: 'stocktakes', readme: true, scope: 'front end' },
    ]);
  });

  it('lists a top-level folder without a README, and skips a nested one', () => {
    const dir = fakeSpec({
      'navigation/notes.md': '',
      'stock/README.md': `# Stock\n\n${FRONT}\n`,
      'stock/archive/old.md': '',
    });
    expect(summary(specFolders(dir))).toEqual([
      { name: 'navigation', readme: false, scope: null },
      { name: 'stock', readme: true, scope: 'front end' },
    ]);
  });

  it('lists a nested README without a scope line, which is not a vertical', () => {
    const dir = fakeSpec({
      'procurement/README.md': `# Procurement\n\n${FULL}\n`,
      'procurement/plan/README.md': '# Plan\n\nNo scope yet.\n',
    });
    expect(summary(specFolders(dir))).toEqual([
      { name: 'procurement', readme: true, scope: 'full stack' },
      { name: 'procurement/plan', readme: true, scope: null },
    ]);
    expect(specVerticals(dir).map(v => v.name)).toEqual(['procurement']);
  });

  it('never enters cases/ or the top-level templates/', () => {
    const dir = fakeSpec({
      'purchase-orders/README.md': `# Purchase orders\n\n${FRONT}\n`,
      'purchase-orders/cases/README.md': '# Cases\n',
      'purchase-orders/cases/old/README.md': '# Old\n',
      'templates/test-case.md': '',
      'templates/area/README.md': `# Area\n\n${FRONT}\n`,
    });
    expect(specFolders(dir).map(f => f.name)).toEqual(['purchase-orders']);
  });
});
