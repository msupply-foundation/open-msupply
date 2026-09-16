import type { GraphqlResult } from '@/api/graphql';
import { isForbidden, missingPermissions } from '@/api/graphql';
import type { DeleteVaccineCourseResult } from './immunisationPrograms.generated';

// Deleting a selection of courses (spec/immunisation-programs rules.md §
// deleting courses, § in-use guards; contract.md § deleting courses). Pure
// logic, no reactivity: one mutation per course, run SEQUENTIALLY in list
// order and stopped at the first refusal — the courses before it are gone, the
// refused course and those after it remain.

/**
 *  - `deleted`   — the course and its doses are retired.
 *  - `in-use`    — refused as _course in use_: a vaccination is recorded
 *                  against one of its doses; the course remains.
 *  - `rejected`  — any other refusal (an unknown id, off-central), with the
 *                  server's own text.
 *  - `forbidden` — the server's own no-permission refusal; the
 *                  permission-denied modal is owed.
 *  - `failed`    — a transport/unexpected failure, already surfaced globally;
 *                  whether the delete committed is unknown.
 */
export type DeleteCourseOutcome =
  | { kind: 'deleted' }
  | { kind: 'in-use' }
  | { kind: 'rejected'; serverError: string }
  | { kind: 'forbidden'; permissions: string[] }
  | { kind: 'failed' };

/** Map one delete's result onto its outcome. */
export const deleteOutcome = (
  result: GraphqlResult<DeleteVaccineCourseResult>
): DeleteCourseOutcome => {
  if (result.kind === 'graphqlError') {
    if (isForbidden(result.errors))
      return {
        kind: 'forbidden',
        permissions: missingPermissions(result.errors),
      };
    const details = result.errors[0]?.extensions?.details;
    return {
      kind: 'rejected',
      serverError:
        typeof details === 'string' && details.length > 0
          ? details
          : (result.errors[0]?.message ?? 'UnknownError'),
    };
  }
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.centralServer.vaccineCourse.deleteVaccineCourse;
  if (response.__typename === 'DeleteResponse') return { kind: 'deleted' };
  if (response.error.__typename === 'VaccineCourseInUse')
    return { kind: 'in-use' };
  return { kind: 'rejected', serverError: response.error.description };
};

/**
 * How a run ended: the ids deleted, and — when it stopped early — the course
 * it stopped at and why. A run with no `stoppedAt` deleted every course.
 */
export type DeleteRun = {
  deleted: string[];
  stoppedAt?: {
    id: string;
    outcome: Exclude<DeleteCourseOutcome, { kind: 'deleted' }>;
  };
};

/**
 * Delete each id in turn, in the order given, stopping at the first that is
 * not deleted (rules § deleting courses; AC-X5). `deleteOne` is the wire call,
 * injected so the run is testable without a backend.
 */
export const runDeletes = async (
  ids: readonly string[],
  deleteOne: (id: string) => Promise<DeleteCourseOutcome>
): Promise<DeleteRun> => {
  const deleted: string[] = [];
  for (const id of ids) {
    const outcome = await deleteOne(id);
    if (outcome.kind !== 'deleted')
      return { deleted, stoppedAt: { id, outcome } };
    deleted.push(id);
  }
  return { deleted };
};
