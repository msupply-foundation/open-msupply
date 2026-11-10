import { describe, expect, it } from 'vitest';
import {
  bumpPatch,
  isBuilt,
  isCurrentManifest,
  isNewer,
  isPublished,
  needingBump,
} from './check-plugin-versions.mjs';

describe('which plugins publish-bundles releases', () => {
  it.each(['plugins/afghanistan', '../private/plugins/cook_islands'])(
    '%s is',
    dir => expect(isPublished(dir)).toBe(true)
  );

  it.each(['plugins/examples/hello_world', '../plugins/examples/api_too_new'])(
    '%s is not',
    dir => expect(isPublished(dir)).toBe(false)
  );
});

describe('what goes into a plugin bundle', () => {
  it.each([
    'src/tally/TallyView.tsx',
    'package.json',
    'backend/src/index.ts',
    'react/frontend/latest/src/index.tsx',
    'forms/forms.json',
  ])('%s does', path => expect(isBuilt(path)).toBe(true));

  it.each([
    'README.md',
    'rules.md',
    'cases/OMS-REG-PLG-XX-01 - Example.md',
    'decisions/0001-stock.json',
    'src/tally/tallyState.test.ts',
    'src/model/__tests__/fixture.json',
    'test-env/docker-compose.yml',
  ])('%s does not', path => expect(isBuilt(path)).toBe(false));
});

describe('which manifests carry the current version', () => {
  it.each([
    'package.json',
    'backend/package.json',
    'react/frontend/latest/package.json',
  ])('%s does', path => expect(isCurrentManifest(path)).toBe(true));

  it.each([
    'react/frontend/1.0.0/package.json',
    'node_modules/vite/package.json',
    'src/package.ts',
  ])('%s does not', path => expect(isCurrentManifest(path)).toBe(false));
});

describe('versions', () => {
  it('compares segment by segment, as numbers', () => {
    expect(isNewer('3.04.08', '3.04.07')).toBe(true);
    expect(isNewer('3.04.10', '3.04.09')).toBe(true);
    expect(isNewer('3.05.00', '3.04.99')).toBe(true);
    expect(isNewer('3.04.07', '3.04.07')).toBe(false);
    expect(isNewer('3.04.06', '3.04.07')).toBe(false);
  });

  it('bumps the patch in the width the line is written in', () => {
    expect(bumpPatch('3.04.07')).toBe('3.04.08');
    expect(bumpPatch('3.04.09')).toBe('3.04.10');
    expect(bumpPatch('1.0.7')).toBe('1.0.8');
    expect(bumpPatch('3.04.99')).toBe('3.04.100');
  });
});

describe('which plugins need a bump', () => {
  const plugin = (built, versions) => ({ name: 'p', built, versions });
  const v = (base, head) => ({ path: 'package.json', base, head });

  it('a changed build on the base version does', () => {
    expect(
      needingBump([plugin(['src/a.ts'], [v('3.04.07', '3.04.07')])])
    ).toHaveLength(1);
  });

  it('one already past the base does not, however many commits follow', () => {
    expect(
      needingBump([plugin(['src/a.ts'], [v('3.04.07', '3.04.08')])])
    ).toHaveLength(0);
  });

  it('one bumped to a number the base has since released does', () => {
    // Another PR merged 3.04.08 first, and the base moved with it.
    expect(
      needingBump([plugin(['src/a.ts'], [v('3.04.08', '3.04.08')])])
    ).toHaveLength(1);
  });

  it('a plugin with nothing built changed does not', () => {
    expect(needingBump([plugin([], [v('3.04.07', '3.04.07')])])).toHaveLength(
      0
    );
  });

  it('a plugin new since the base does not', () => {
    expect(
      needingBump([plugin(['src/a.ts'], [v(undefined, '1.0.0')])])
    ).toHaveLength(0);
  });

  it('one half past the base is the bump: the build holds the halves together', () => {
    const halves = [
      v('3.04.07', '3.04.08'),
      {
        path: 'react/frontend/latest/package.json',
        base: '3.04.07',
        head: '3.04.07',
      },
    ];
    expect(needingBump([plugin(['src/a.ts'], halves)])).toHaveLength(0);
  });
});
