import type { Plugin } from 'vite';

/*
 * Keeps the heavy lazy-only modules out of the eager entry (kdd/bundling,
 * kdd/custom-forms/specs.md § Forms in the UI; implementation-plan H1).
 *
 * The form library (its fields, the AJV validator and the host's default
 * forms) must load only when a form first opens: the host and every plugin
 * reach it through a dynamic import, so it is one chunk, shared. A single
 * static import of it from anything the startup path loads would pull AJV
 * into every page load and nothing would notice. So the build walks each
 * entry chunk's STATIC import graph and fails if any of these modules is in
 * it. It also fails if the form library is absent from the build altogether,
 * so the check cannot pass by having nothing to check.
 */

// The form library's validator: in every app build, and never eager.
const VALIDATOR_MODULE = '/src/domain/documentForm/validation.ts';

/** A module id containing any of these is lazy-only. */
export const LAZY_ONLY_MODULES: readonly string[] = [
  '/src/domain/documentForm/formLibrary.ts',
  VALIDATOR_MODULE,
  '/src/domain/documentForm/fields.tsx',
  '/src/domain/documentForm/defaults.tsx',
  // The form host, which every document screen and the edit-patient modal
  // reach, and which pulls in migration and the document operations.
  '/src/domain/documentForm/createDocumentForm.ts',
  '/src/plugins/DocumentFormRegion.tsx',
  // The host's patient fields, which the library carries for patient forms.
  '/src/domain/patient/documentFields.tsx',
  '/src/domain/documentForm/baseSchemas/',
  '/node_modules/ajv/',
  '/node_modules/ajv-formats/',
];

/** The part of Rollup's output bundle the check reads. */
export type GuardBundle = Record<
  string,
  | {
      type: 'chunk';
      fileName: string;
      isEntry: boolean;
      imports: readonly string[];
      moduleIds: readonly string[];
    }
  | { type: 'asset' }
>;

export interface EagerLeak {
  /** The entry chunk whose static graph reaches the module. */
  entry: string;
  /** The chunk that holds it. */
  chunk: string;
  module: string;
}

/** Every lazy-only module a static import from an entry chunk reaches. */
export const eagerLeaks = (
  bundle: GuardBundle,
  lazyOnly: readonly string[] = LAZY_ONLY_MODULES
): EagerLeak[] => {
  const leaks: EagerLeak[] = [];
  for (const entry of Object.values(bundle)) {
    if (entry.type !== 'chunk' || !entry.isEntry) continue;
    const seen = new Set<string>();
    const queue = [entry.fileName];
    while (queue.length > 0) {
      const fileName = queue.shift() as string;
      if (seen.has(fileName)) continue;
      seen.add(fileName);
      const chunk = bundle[fileName];
      if (!chunk || chunk.type !== 'chunk') continue;
      for (const id of chunk.moduleIds) {
        if (lazyOnly.some(m => id.includes(m))) {
          leaks.push({ entry: entry.fileName, chunk: fileName, module: id });
        }
      }
      queue.push(...chunk.imports);
    }
  }
  return leaks;
};

/** True when some chunk of the build holds the form library's validator. */
export const formLibraryBuilt = (bundle: GuardBundle): boolean =>
  Object.values(bundle).some(
    c =>
      c.type === 'chunk' &&
      c.moduleIds.some(id => id.includes(VALIDATOR_MODULE))
  );

export const lazyChunkGuardPlugin = (): Plugin => ({
  name: 'omsupply-lazy-chunk-guard',
  apply: 'build',
  generateBundle(_options, bundle) {
    const view = bundle as unknown as GuardBundle;
    const leaks = eagerLeaks(view);
    if (leaks.length > 0) {
      const lines = leaks.map(
        l =>
          `  ${l.module}\n    in ${l.chunk}, statically reached from ${l.entry}`
      );
      this.error(
        `Lazy-only modules reached the eager entry (vite/lazyChunkGuard.ts):\n${lines.join('\n')}`
      );
    }
    // Only a build with the plugin SDK entry must carry the form library; a
    // build without that entry (the component showcase's) has no forms.
    if (!formLibraryBuilt(view) && Object.values(view).some(isAppEntry)) {
      this.error(
        'The form library is missing from the build (vite/lazyChunkGuard.ts): nothing imports src/domain/documentForm/formLibrary.ts.'
      );
    }
  },
});

const isAppEntry = (c: GuardBundle[string]): boolean =>
  c.type === 'chunk' && c.isEntry && c.fileName.includes('plugin-sdk');
