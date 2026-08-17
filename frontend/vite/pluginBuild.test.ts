import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pluginPackageIdentity, pluginViteConfig } from './pluginBuild.ts';

const exampleDir = (name: string): string =>
  fileURLToPath(new URL(`../examples/${name}`, import.meta.url));

describe('pluginPackageIdentity', () => {
  it('reads code and version from the plugin package.json', () => {
    expect(pluginPackageIdentity(exampleDir('hello_world'))).toEqual({
      code: 'hello_world',
      version: '1.0.0',
    });
  });

  it('names the path when there is no readable package.json', () => {
    expect(() => pluginPackageIdentity('/nowhere/at/all')).toThrow(
      /cannot read \/nowhere\/at\/all\/package\.json/
    );
  });
});

const emittedName = (config: ReturnType<typeof pluginViteConfig>): string => {
  const lib = config.build?.lib;
  if (!lib || typeof lib === 'boolean' || lib.fileName === undefined) {
    throw new Error('config has no lib fileName');
  }
  return typeof lib.fileName === 'function'
    ? lib.fileName('es', 'plugin')
    : lib.fileName;
};

describe('pluginViteConfig identity defaulting', () => {
  it('derives the emitted file name from package.json', () => {
    const config = pluginViteConfig({
      entry: 'plugin.tsx',
      root: exampleDir('hello_world'),
    });
    expect(emittedName(config)).toBe('hello_world.js');
    expect(config.build?.outDir).toBe('dist');
  });

  it('lets an explicit code override the package name', () => {
    const config = pluginViteConfig({
      entry: 'plugin.tsx',
      root: exampleDir('hello_world'),
      code: 'mislabelled',
      version: '9.9.9',
    });
    expect(emittedName(config)).toBe('mislabelled.js');
  });
});
