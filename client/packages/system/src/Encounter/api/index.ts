import {
  EncounterFragment,
  EncounterRowFragment,
} from './operations.generated';

type EncounterFragmentWithId = { id: string } & EncounterFragment;
type EncounterRowFragmentWithId = { id: string } & EncounterRowFragment;

export * from './hooks';
export {
  EncounterFragment,
  EncounterRowFragment,
  EncounterFragmentWithId,
  EncounterRowFragmentWithId,
};
