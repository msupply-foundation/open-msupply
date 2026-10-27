import { describe, expect, it, vi } from 'vitest';

/*
 * The default enrolment form's check for answers it can't give
 * (spec/program-enrolment rules § the default form; case OMS-REG-PAT-04
 * `.52`, `.62`). The validator runs for real against a program's schema; the
 * form's own rendering is the e2e suite's.
 */

vi.mock('../../intl', () => ({ t: (key: string) => key }));
// The form's controls render DOM, which this check never reaches.
vi.mock('./fields', () => ({}));
vi.mock('../../ui/elements/inputs/TextArea', () => ({}));
vi.mock('../../ui/layout/Stack/Stack', () => ({}));
vi.mock('../../auth/authContext', () => ({}));

import { unaskedEnrolmentAnswers } from './defaults';

// A program whose form rules require the default form's fields, the store,
// and two answers only its own form asks for.
const registry = {
  formSchemaId: 'defaults-test-asks-more',
  jsonSchema: {
    type: 'object',
    required: [
      'enrolmentDatetime',
      'programEnrolmentId',
      'notes',
      'storeId',
      'status',
      'extension',
    ],
    properties: {
      status: { type: 'string' },
      extension: {
        type: 'object',
        required: ['riskGroup'],
        properties: { riskGroup: { type: 'string' } },
      },
    },
  },
};

describe('OMS-REG-PAT-04.52 — what the default form cannot ask for', () => {
  it("names the program's required answers outside the default form", () => {
    expect(unaskedEnrolmentAnswers(registry, {})).toEqual([
      'status',
      'extension',
    ]);
  });

  it("never counts the default form's fields, or the store, as lacking", () => {
    const lacking = unaskedEnrolmentAnswers(registry, {});
    for (const asked of [
      'enrolmentDatetime',
      'programEnrolmentId',
      'notes',
      'storeId',
    ])
      expect(lacking).not.toContain(asked);
  });

  it('names a nested answer by its full path', () => {
    expect(
      unaskedEnrolmentAnswers(registry, { status: 'ACTIVE', extension: {} })
    ).toEqual(['extension.riskGroup']);
  });

  it('counts only missing answers, not wrong ones', () => {
    expect(
      unaskedEnrolmentAnswers(registry, {
        status: 7,
        extension: { riskGroup: 'HIGH' },
      })
    ).toEqual([]);
  });
});

describe("OMS-REG-PAT-04.62 — an enrolment that already holds its program's answers", () => {
  it('lacks nothing', () => {
    expect(
      unaskedEnrolmentAnswers(registry, {
        status: 'ACTIVE',
        extension: { riskGroup: 'HIGH' },
      })
    ).toEqual([]);
  });
});
