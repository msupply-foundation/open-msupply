/*
 * The enrolment ID field's two server questions (spec/program-enrolment rules
 * § the enrolment ID): is an ID free, and which generated ID to use. The field
 * itself is ./EnrolmentIdField.tsx; these stay apart so their rules are tested
 * without a form.
 */
import { graphqlFetch } from '../../api/graphql';
import { EnrolmentsHoldingId } from './enrolmentId.generated';

/** An ID as the duplicate check compares it: unpadded, any case. */
const comparable = (id: string): string => id.trim().toLowerCase();

/**
 * Whether no OTHER enrolment holds `id`. The check spans every program the
 * user may view, and ignores case and surrounding spaces: "gry-0005" is a
 * duplicate of "GRY-0005". An enrolment's own saved ID (`documentName`,
 * undefined until the first save) is never its duplicate. Undefined when the
 * check could not be made; the failure is reported globally.
 */
export const isEnrolmentIdFree = async (
  storeId: string,
  id: string,
  documentName: string | undefined
): Promise<boolean | undefined> => {
  const result = await graphqlFetch(EnrolmentsHoldingId, { storeId, id });
  if (result.kind !== 'success') return undefined;
  const wanted = comparable(id);
  return result.data.programEnrolments.nodes.every(
    holder =>
      comparable(holder.programEnrolmentId ?? '') !== wanted ||
      holder.name === documentName
  );
};

// A bound on the redraws, so a format that keeps landing on held IDs cannot
// spin. Each draw spends a counter number, never given back.
const MAX_DRAWS = 20;

/**
 * Draws IDs from the program's format until one no other enrolment holds,
 * skipping each held one. Stops early on a draw that repeats the previous
 * one, keeping it, as the current app does: a format whose number part does
 * not move would otherwise draw for ever. A check that could not be made
 * keeps the candidate. Undefined when a draw fails (the program's format
 * reported it).
 */
export const drawFreeEnrolmentId = async (
  generate: () => Promise<string | undefined>,
  isFree: (id: string) => Promise<boolean | undefined>
): Promise<string | undefined> => {
  let previous: string | undefined;
  for (let draw = 0; draw < MAX_DRAWS; draw++) {
    const candidate = await generate();
    if (candidate === undefined) return undefined;
    if (candidate === previous) return candidate;
    if ((await isFree(candidate)) !== false) return candidate;
    previous = candidate;
  }
  return previous;
};
