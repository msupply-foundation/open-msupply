import { describe, expect, it } from 'vitest';
import {
  eagerLeaks,
  formLibraryBuilt,
  type GuardBundle,
} from './lazyChunkGuard.ts';

const chunk = (
  fileName: string,
  moduleIds: string[],
  opts: { isEntry?: boolean; imports?: string[] } = {}
): GuardBundle[string] => ({
  type: 'chunk',
  fileName,
  isEntry: opts.isEntry ?? false,
  imports: opts.imports ?? [],
  moduleIds,
});

const bundleOf = (...chunks: GuardBundle[string][]): GuardBundle =>
  Object.fromEntries(
    chunks.map(c => [c.type === 'chunk' ? c.fileName : 'asset', c])
  );

const VALIDATION = '/repo/frontend/src/domain/documentForm/validation.ts';
const AJV = '/repo/node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/ajv.js';

describe('eagerLeaks', () => {
  it('passes a form library reached only by dynamic import', () => {
    const bundle = bundleOf(
      chunk('index.js', ['/repo/frontend/src/index.tsx'], {
        isEntry: true,
        imports: ['shared.js'],
      }),
      chunk('shared.js', ['/repo/frontend/src/ui/Button.tsx']),
      chunk('formLibrary.js', [VALIDATION, AJV])
    );
    expect(eagerLeaks(bundle)).toEqual([]);
    expect(formLibraryBuilt(bundle)).toBe(true);
  });

  it('names a lazy-only module a static import pulls into an entry', () => {
    const bundle = bundleOf(
      chunk('index.js', ['/repo/frontend/src/index.tsx'], {
        isEntry: true,
        imports: ['shared.js'],
      }),
      chunk('shared.js', [AJV], { imports: ['index.js'] })
    );
    expect(eagerLeaks(bundle)).toEqual([
      { entry: 'index.js', chunk: 'shared.js', module: AJV },
    ]);
  });

  it('reports a build with no form library in it', () => {
    const bundle = bundleOf(
      chunk('index.js', ['/repo/frontend/src/index.tsx'], { isEntry: true })
    );
    expect(formLibraryBuilt(bundle)).toBe(false);
  });
});
