import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

/*
 * The production build wraps each `import()` it compiles in Vite's preload
 * helper, whose `vite:preloadError` the app reads as "a new build has replaced
 * this one" (src/staleBundle.ts). The import that takes a plugin bundle's URL
 * must not be one of them, or a broken plugin reads as a stale app — one silent
 * reload, then a modal no refresh clears.
 *
 * Only a build adds the helper, and node cannot run the import itself, so this
 * builds the real module beside a control — a plain `import()` of a URL — and
 * reads the output.
 */

const PRELOAD_ERROR = 'vite:preloadError';
const CONTROL = 'virtual:plain-dynamic-import';

type Output = {
  type: 'chunk' | 'asset';
  fileName: string;
  name?: string;
  code?: string;
  source?: string | Uint8Array;
  imports?: string[];
};

const buildOutput = async (): Promise<Output[]> => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    publicDir: false,
    root: fileURLToPath(new URL('../..', import.meta.url)),
    plugins: [
      {
        name: 'plain-dynamic-import',
        resolveId: id => (id === CONTROL ? id : undefined),
        load: id =>
          id === CONTROL
            ? 'export const load = url => import(/* @vite-ignore */ url);'
            : undefined,
      },
    ],
    build: {
      write: false,
      minify: false,
      rollupOptions: {
        // An app build drops entry exports, which would shake both entries
        // down to nothing.
        preserveEntrySignatures: 'strict',
        input: {
          plugin: fileURLToPath(
            new URL('./importPluginBundle.ts', import.meta.url)
          ),
          control: CONTROL,
        },
      },
    },
  });
  const [first] = Array.isArray(result) ? result : [result];
  if (!first || !('output' in first)) throw new Error('no build output');
  return first.output as Output[];
};

const text = (file: Output): string =>
  file.code ??
  (typeof file.source === 'string'
    ? file.source
    : new TextDecoder().decode(file.source));

// An entry's own code and every chunk it directly imports.
const entryGraph = (output: Output[], name: string): string => {
  const byName = new Map(output.map(file => [file.fileName, file]));
  const entry = output.find(
    file => file.type === 'chunk' && file.name === name
  );
  if (!entry) throw new Error(`no ${name} entry`);
  return [entry, ...(entry.imports ?? []).map(f => byName.get(f))]
    .filter((file): file is Output => file !== undefined)
    .map(text)
    .join('\n');
};

describe('importPluginBundle in the production build', () => {
  it('imports the plugin bundle from a file the build leaves untouched', async () => {
    const output = await buildOutput();

    // The control: a plain `import()` IS wrapped, so the check below is not
    // passing by the build wrapping nothing.
    expect(entryGraph(output, 'control')).toContain(PRELOAD_ERROR);

    // The import that takes the plugin's URL is a separate same-origin file —
    // not inlined as a `data:` URL — copied as written: the browser's own
    // `import()`, with no helper to report its failure as a stale app.
    const native = output.filter(
      file =>
        file.type === 'asset' && /nativeImport-.*\.js$/.test(file.fileName)
    );
    expect(native).toHaveLength(1);
    expect(text(native[0])).toMatch(/import\(\s*\/\*.*\*\/\s*url\s*\)/);
    expect(text(native[0])).not.toContain(PRELOAD_ERROR);
    expect(entryGraph(output, 'plugin')).toContain(`/${native[0].fileName}`);
    expect(entryGraph(output, 'plugin')).not.toContain('data:text/javascript');
  }, 30_000);
});
