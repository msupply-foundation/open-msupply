import { DocumentRegistryTypeNode, useQuery } from '@openmsupply-client/common';
import {
  DocumentRegistryFragment,
  useDocumentRegistryApi,
  ProgramEnrolmentRowFragmentWithId,
} from '@openmsupply-client/programs';

export type EncounterRegistryByProgram = {
  program: ProgramEnrolmentRowFragmentWithId;
  encounter: DocumentRegistryFragment;
};

// Fetches available encounters for a list of programs (e.g. for the enrolled programs)
export const useEncounterRegistriesByPrograms = (
  programs: ProgramEnrolmentRowFragmentWithId[]
) => {
  const api = useDocumentRegistryApi();
  const programIds = programs
    .map(it => it.document.documentRegistry?.id)
    .filter((it): it is string => !!it);
  return useQuery(api.keys.registriesByParents(programIds), () =>
    api.get
      .documentRegistries({
        filter: {
          type: {
            equalTo: DocumentRegistryTypeNode.Encounter,
          },
          contextId: {
            equalAny: programs.map(it => it.contextId),
          },
        },
      })
      .then(result =>
        result.nodes
          .map(encounter => {
            const program = programs.find(
              p => p.contextId === encounter.contextId
            );
            if (!program) return undefined;
            const entry: EncounterRegistryByProgram = {
              program,
              encounter,
            };
            return entry;
          })
          .filter((it): it is EncounterRegistryByProgram => !!it)
      )
  );
};
