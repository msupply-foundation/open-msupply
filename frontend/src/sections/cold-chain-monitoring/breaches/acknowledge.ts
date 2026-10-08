import type { UpdateTemperatureBreachVariables } from '../monitoring.generated';
import { isOngoing } from '../monitoring/breachDisplay';

// The acknowledgement modal's rules (spec/cold-chain-monitoring rules ›
// acknowledging a breach; ui-surface S3). Framework-free so the two guards —
// only an ended breach, only with a non-blank comment — and the write's shape
// are unit-testable in node.
//
// Both guards are the FRONTEND's obligation alone (contract › acknowledging a
// breach): the server acknowledges an ongoing breach without complaint, and
// its comment check is `is_empty()`, so a lone space passes it. Nothing here
// relies on a rejection.

/**
 * Which of the two mutually exclusive bodies the modal shows (ui-surface S3):
 * an ongoing breach gets the notice and no comment field; an ended one gets
 * the comment field.
 */
export type AcknowledgeState = 'ongoing' | 'ended';

export const acknowledgeState = (breach: {
  endDatetime: string | null;
}): AcknowledgeState => (isOngoing(breach) ? 'ongoing' : 'ended');

/**
 * A comment is required and MUST be more than whitespace (rules ›
 * acknowledging a breach). Trimmed, so a comment of spaces, tabs or newlines
 * is as empty as none.
 */
export const isCommentValid = (comment: string): boolean =>
  comment.trim().length > 0;

/**
 * Whether the confirm action is available: never for an ongoing breach,
 * whatever has been typed (`.18`), and for an ended one only once a real
 * comment is entered (`.19`).
 */
export const canConfirm = (
  breach: { endDatetime: string | null },
  comment: string
): boolean => acknowledgeState(breach) === 'ended' && isCommentValid(comment);

/**
 * The stored comment is the user's text wrapped with who acknowledged and
 * when — composed by the CLIENT, since the server persists `comment` verbatim
 * (contract › acknowledging a breach). These are the variables the
 * `format.comment` template takes; the comment is trimmed so the stored
 * sentence ends cleanly.
 */
export const attributionVars = (
  comment: string,
  name: string,
  date: string
): { name: string; date: string; comment: string } => ({
  name,
  date,
  comment: comment.trim(),
});

/**
 * The write: `unacknowledged: false` is the target state — the flag is the
 * negative of the domain word — with the composed comment. Acknowledgement is
 * one-way in this vertical (rules): nothing here ever builds `true`.
 */
export const buildAcknowledgeInput = (
  breachId: string,
  composedComment: string
): UpdateTemperatureBreachVariables['input'] => ({
  id: breachId,
  unacknowledged: false,
  comment: composedComment,
});
