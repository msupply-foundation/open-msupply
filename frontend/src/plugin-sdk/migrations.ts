import type {
  Migration,
  MigrationStep,
} from '../domain/documentForm/migration';

/**
 * Declare one migration step of a document type (kdd/custom-forms/specs.md §
 * Opening an older document): its coverage map, and optionally a `transform`
 * for what the map cannot express. `T` is the type the step migrates to, so
 * the compiler checks the map's new paths and mapped values against it:
 *
 *     export const v1ToV2 = defineMigration<DemoEncounter>({
 *       from: 1,
 *       moved: { 'extension.demo.weightKg': 'extension.demo.vitals.weightKg' },
 *       unresolved: { 'extension.demo.regimen': ['LEGACY_TRIAL'] },
 *     });
 *
 * Pure: it returns the step unchanged, with its paths erased to strings, so
 * the form contribution's `migrations` can list steps written against
 * different types. The plugin build checks every step against the two schema
 * versions it spans.
 */
export const defineMigration = <T extends object>(
  migration: Migration<T>
): MigrationStep =>
  // Sound for every concrete `T`: each typed path is a string. The compiler
  // cannot see that through the mapped types while `T` is still generic.
  migration as unknown as MigrationStep;
