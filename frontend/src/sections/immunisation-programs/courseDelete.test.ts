import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import type { DeleteVaccineCourseResult } from './immunisationPrograms.generated';
import {
  deleteOutcome,
  runDeletes,
  type DeleteCourseOutcome,
} from './courseDelete';

// Anchors: spec/immunisation-programs/acceptance.md — deleting courses and
// the in-use guard.
//   AC-U4  a course with a vaccination recorded is refused as _course in use_
//   AC-X4  one unused course deletes
//   AC-X5  a run stops at the first refusal: the courses before it are gone,
//          the refused and later ones remain
// The run and the outcome mapping are pure, so both are pinned here; the
// dialog lifecycle around them is exercised in the UI.

const deleted = (id: string): GraphqlResult<DeleteVaccineCourseResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      vaccineCourse: {
        deleteVaccineCourse: { __typename: 'DeleteResponse', id },
      },
    },
  },
});

type DeleteErrorTypename = Extract<
  DeleteVaccineCourseResult['centralServer']['vaccineCourse']['deleteVaccineCourse'],
  { __typename: 'DeleteVaccineCourseError' }
>['error']['__typename'];

const refused = (
  typename: DeleteErrorTypename,
  description: string
): GraphqlResult<DeleteVaccineCourseResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      vaccineCourse: {
        deleteVaccineCourse: {
          __typename: 'DeleteVaccineCourseError',
          error: { __typename: typename, description },
        },
      },
    },
  },
});

describe('AC-X4 — a delete that went through', () => {
  it('reads DeleteResponse as deleted', () => {
    expect(deleteOutcome(deleted('c1'))).toEqual({ kind: 'deleted' });
  });
});

describe('AC-U4 — the in-use refusal is the typed member', () => {
  it('reads VaccineCourseInUse as in-use', () => {
    expect(
      deleteOutcome(
        refused(
          'VaccineCourseInUse',
          'The vaccine course is in use and cannot be deleted.'
        )
      )
    ).toEqual({ kind: 'in-use' });
  });
});

describe('the untyped refusals (contract § rejections)', () => {
  it('reads an unknown id as a rejection carrying the variant name', () => {
    expect(
      deleteOutcome({
        kind: 'graphqlError',
        message: 'Bad user input',
        errors: [
          {
            message: 'Bad user input',
            extensions: { details: 'VaccineCourseDoesNotExist' },
          },
        ],
      })
    ).toEqual({ kind: 'rejected', serverError: 'VaccineCourseDoesNotExist' });
  });

  it('reads the off-central refusal at the centralServer root as a rejection with its text', () => {
    expect(
      deleteOutcome({
        kind: 'graphqlError',
        message: 'Internal error',
        errors: [
          {
            message: 'Internal error',
            path: ['centralServer'],
            extensions: { details: 'Not a central server' },
          },
        ],
      })
    ).toEqual({ kind: 'rejected', serverError: 'Not a central server' });
  });

  it("reads a Forbidden as the server's no-permission refusal, naming the permission", () => {
    expect(
      deleteOutcome({
        kind: 'graphqlError',
        message: 'Forbidden',
        errors: [
          {
            message: 'Forbidden',
            extensions: {
              details:
                'Missing permission: EditCentralData, Required permissions: HasPermission(EditCentralData), Store: None',
            },
          },
        ],
      })
    ).toEqual({ kind: 'forbidden', permissions: ['EditCentralData'] });
  });

  it('reads a transport failure as failed', () => {
    expect(deleteOutcome({ kind: 'unexpectedError' })).toEqual({
      kind: 'failed',
    });
  });
});

describe('AC-X5 — the run stops at the first refusal, in order', () => {
  const outcomes: Record<string, DeleteCourseOutcome> = {
    a: { kind: 'deleted' },
    b: { kind: 'in-use' },
    c: { kind: 'deleted' },
  };
  const calls: string[] = [];
  const deleteOne = async (id: string) => {
    calls.push(id);
    return outcomes[id] ?? { kind: 'failed' };
  };

  it('deletes the courses before the refusal and never reaches the ones after it', async () => {
    calls.length = 0;
    const run = await runDeletes(['a', 'b', 'c'], deleteOne);
    expect(run.deleted).toEqual(['a']);
    expect(run.stoppedAt).toEqual({ id: 'b', outcome: { kind: 'in-use' } });
    expect(calls).toEqual(['a', 'b']);
  });

  it('deletes every course when nothing refuses', async () => {
    calls.length = 0;
    const run = await runDeletes(['a', 'c'], deleteOne);
    expect(run).toEqual({ deleted: ['a', 'c'] });
    expect(calls).toEqual(['a', 'c']);
  });
});
