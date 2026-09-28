/*
 * How a DemoEncounter recorded under an earlier schema version becomes the
 * current type (kdd/custom-forms/specs.md § Opening an older document). The
 * host runs these in memory when such a document is opened for editing, and
 * the plugin build checks each step's coverage map against the two schema
 * versions it spans, failing on any difference the map leaves out.
 *
 * v1 → v2 (./v1.ts → ./type.ts):
 *   - weight and height move under `vitals`;
 *   - the `LEGACY_TRIAL` regimen is retired with no current equivalent, so a
 *     v1 value is unresolved: the form shows it as previously recorded, under
 *     the label the archived v1 form gave it, and asks for a current regimen
 *     before the encounter can be saved;
 *   - `adherence` is removed from the type but kept in the document, listed
 *     read-only at the end of the form.
 */
import { defineMigration } from '@openmsupply/plugin-sdk';
import { intl } from '../../intl';
import type { DemoEncounter } from './type';

export const v1ToV2 = defineMigration<DemoEncounter>({
  from: 1,
  moved: {
    'extension.demo.weightKg': 'extension.demo.vitals.weightKg',
    'extension.demo.heightCm': 'extension.demo.vitals.heightCm',
  },
  unresolved: {
    'extension.demo.regimen': {
      LEGACY_TRIAL: () => intl.t('regimen.LEGACY_TRIAL'),
    },
  },
  kept: { 'extension.demo.adherence': () => intl.t('kept.adherence') },
});

/** Every step, in the form the encounter contribution and the build read. */
export const migrations = [v1ToV2];
