import {
  EncounterFragment,
  EncounterRowFragment,
} from './operations.generated';

type EncounterFragmentWithId = { id: string } & EncounterFragment;

export * from './hooks';
export { EncounterFragment, EncounterRowFragment, EncounterFragmentWithId };
