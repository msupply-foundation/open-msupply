import {
  DocumentRegistryCategoryNode,
  useQuery,
} from '@openmsupply-client/common';
import {
  DocumentRegistryFragment,
  useDocumentRegistryApi,
  ProgramEnrolmentRowFragment,
} from '@openmsupply-client/programs';

export type EncounterRegistryByProgram = {
  program: ProgramEnrolmentRowFragment;
  encounter: DocumentRegistryFragment;
};

// Fetches available encounters for a list of programs (e.g. for the enrolled programs)
export const useEncounterRegistriesByPrograms = (
  programs: ProgramEnrolmentRowFragment[]
) => {
  const api = useDocumentRegistryApi();
  const programIds = programs
    .map(it => it.document.documentRegistry?.id)
    .filter((it): it is string => !!it);
  return useQuery(api.keys.registriesByParents(programIds), () =>
    api.get
      .documentRegistries({
        filter: {
          category: {
            equalTo: DocumentRegistryCategoryNode.Encounter,
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
