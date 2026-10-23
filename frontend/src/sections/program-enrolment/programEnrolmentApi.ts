import { graphqlFetch } from '@/api/graphql';
import { ImmunisationProgramContexts } from './programEnrolment.generated';

/*
 * The contexts the store's immunisation programs keep their documents in, to
 * narrow the program picker opened from a patient's Vaccinations tab (spec/
 * program-enrolment rules § enrolling a patient). Matched on context, not
 * program id: a document registry entry names its context, and the two ids
 * can differ. Never-throwing: undefined when the read fails (reported
 * globally), and the picker then offers every program.
 */
export const fetchImmunisationContexts = async (
  storeId: string
): Promise<ReadonlySet<string> | undefined> => {
  const result = await graphqlFetch(ImmunisationProgramContexts, { storeId });
  if (result.kind !== 'success') return undefined;
  return new Set(result.data.programs.nodes.map(p => p.contextId));
};

/**
 * The programs the picker offers: every enrolment program the user may see,
 * or, opened from a patient's Vaccinations tab, only the immunisation ones.
 * Every program while the immunisation contexts are unknown.
 */
export const programsToOffer = <T extends { contextId: string }>(
  registries: readonly T[],
  fromVaccinations: boolean,
  immunisationContexts: ReadonlySet<string> | undefined
): T[] =>
  fromVaccinations && immunisationContexts
    ? registries.filter(r => immunisationContexts.has(r.contextId))
    : [...registries];
