import { useQuery } from '@openmsupply-client/common';
import { DocumentRegistryFragment } from '@openmsupply-client/programs';
import { useDocumentRegistryApi } from 'packages/programs/src/api/hooks/utils/useDocumentRegistryApi';
import { ProgramEnrolmentRowFragmentWithId } from '../../../ProgramEnrolment/api';

export type EncounterRegistry = {
  program: ProgramEnrolmentRowFragmentWithId;
  encounter: DocumentRegistryFragment;
};

// Fetches available encounters for a list of programs (e.g. for the enrolled programs)
export const useProgramEncounters = (
  programs: ProgramEnrolmentRowFragmentWithId[]
) => {
  const api = useDocumentRegistryApi();
  const programIds = programs
    .map(it => it.document.documentRegistry?.id)
    .filter((it): it is string => !!it);
  return {
    ...useQuery(api.keys.encountersByPrograms(programIds), () =>
      api.get
        .documentRegistries({
          filter: {
            parentId: {
              equalAny: programIds,
            },
          },
        })
        .then(result =>
          result.nodes
            .map(encounter => {
              const program = programs.find(
                p => p.document?.documentRegistry?.id === encounter.parentId
              );
              if (!program) return undefined;
              const entry: EncounterRegistry = {
                program,
                encounter,
              };
              return entry;
            })
            .filter((it): it is EncounterRegistry => !!it)
        )
    ),
  };
};
