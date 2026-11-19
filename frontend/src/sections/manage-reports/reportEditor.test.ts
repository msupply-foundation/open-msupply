import { describe, expect, it } from 'vitest';
import {
  canSaveReport,
  draftFromVersion,
  reportSaveOutcome,
  reportUpdateInput,
} from './reportEditor';
import type { ReportVersion } from './reportRegister';
import type { GraphqlResult } from '@/api/graphql';
import type { UpdateReportResult } from './manageReports.generated';

// Anchors: spec/manage-reports/cases/OMS-REG-MNG-06.
//   .17 — saving is unavailable until the active state differs
//   .18 — abandoning an edit leaves the version as it was
//   .21 — active state is the only property that can be changed

const version = (overrides: Partial<ReportVersion> = {}): ReportVersion => ({
  id: 'stock-detail_2_6_6_false',
  name: 'Stock Detail',
  code: 'stock-detail',
  version: '2.6.6',
  isActive: true,
  isCustom: false,
  ...overrides,
});

describe('OMS-REG-MNG-06.17 — saving needs an actual change', () => {
  it('cannot save a freshly opened version', () => {
    const v = version();
    expect(canSaveReport(draftFromVersion(v), v)).toBe(false);
  });

  it('can save once the active state is flipped', () => {
    const v = version({ isActive: true });
    expect(canSaveReport({ ...draftFromVersion(v), isActive: false }, v)).toBe(
      true
    );
  });

  it('cannot save after flipping back to the stored value', () => {
    // Toggling twice returns the draft to the stored state — the dialog must
    // offer nothing to do, so closing it cannot rewrite the row.
    const v = version({ isActive: false });
    const draft = { ...draftFromVersion(v), isActive: true };
    expect(canSaveReport({ ...draft, isActive: false }, v)).toBe(false);
  });
});

describe('OMS-REG-MNG-06.18 — an abandoned edit writes nothing', () => {
  it('derives the draft from the version, leaving the version untouched', () => {
    const v = version({ isActive: true });
    const draft = draftFromVersion(v);
    draft.isActive = false;
    // The draft is a copy: discarding it cannot have changed the row it came
    // from, which is what makes Cancel safe without any undo.
    expect(v.isActive).toBe(true);
  });
});

describe('OMS-REG-MNG-06.21 — active state is the only mutable property', () => {
  it('builds an input carrying exactly id and isActive', () => {
    const input = reportUpdateInput({ id: 'r1', isActive: false });
    expect(input).toEqual({ id: 'r1', isActive: false });
    // Nothing else can travel: name, code, version, custom and context are
    // fixed at install time.
    expect(Object.keys(input).sort()).toEqual(['id', 'isActive']);
  });

  it('carries nothing from the version beyond its id and active state', () => {
    const draft = draftFromVersion(version());
    expect(Object.keys(draft).sort()).toEqual(['id', 'isActive']);
  });
});

describe('the save outcome', () => {
  it('reports the active state the server confirmed', () => {
    const result: GraphqlResult<UpdateReportResult> = {
      kind: 'success',
      data: {
        centralServer: {
          reports: { updateReport: { id: 'r1', isActive: false } },
        },
      },
    };
    expect(reportSaveOutcome(result)).toEqual({
      kind: 'saved',
      isActive: false,
    });
  });

  it('passes the server’s own description through for an untyped rejection', () => {
    // "Report not found" has no typed member, so it is surfaced as sent
    // rather than recognised and reworded (error-handling parity).
    const result: GraphqlResult<UpdateReportResult> = {
      kind: 'graphqlError',
      message: 'Bad user input',
      errors: [
        {
          message: 'Bad user input',
          extensions: { details: 'Report not found' },
        },
      ],
    };
    expect(reportSaveOutcome(result)).toEqual({
      kind: 'rejected',
      serverError: 'Report not found',
    });
  });

  it('falls back to the error message when no details are carried', () => {
    const result: GraphqlResult<UpdateReportResult> = {
      kind: 'graphqlError',
      message: 'Bad user input',
      errors: [{ message: 'Bad user input' }],
    };
    expect(reportSaveOutcome(result)).toEqual({
      kind: 'rejected',
      serverError: 'Bad user input',
    });
  });

  it('leaves a transport failure to the global modal', () => {
    expect(reportSaveOutcome({ kind: 'unexpectedError' })).toEqual({
      kind: 'failed',
    });
  });
});
