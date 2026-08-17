import { describe, expect, it } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import { allDeleted, deleteOutcome, summariseOutcomes } from './deleteSites';
import type { DeleteSiteResult } from './sites.generated';

// Anchors: spec/sites/cases/OMS-FUN-SYC-002 (behaviours cited per describe).

const deleted = (id: number): GraphqlResult<DeleteSiteResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      site: { deleteSite: { __typename: 'DeleteSiteNode', id } },
    },
  },
});

const typedError = (
  __typename: 'SiteHasStores' | 'CannotDeleteCentralSite'
): GraphqlResult<DeleteSiteResult> => ({
  kind: 'success',
  data: {
    centralServer: {
      site: {
        deleteSite: {
          __typename: 'DeleteSiteError',
          error: { __typename, description: 'refused' },
        },
      },
    },
  },
});

describe('OMS-FUN-SYC-002.37 — a site with any assigned store cannot be deleted, from the editor or the list', () => {
  it('maps the typed SiteHasStores rejection to its own report reason', () => {
    expect(deleteOutcome(4, typedError('SiteHasStores'))).toEqual({
      kind: 'refused',
      id: 4,
      reason: 'hasStores',
    });
  });
});

describe('OMS-FUN-SYC-002.38 — moving every store off a site makes it deletable', () => {
  it('reports the delete as done once nothing blocks it', () => {
    expect(deleteOutcome(4, deleted(4))).toEqual({ kind: 'deleted', id: 4 });
  });
});

describe('OMS-FUN-SYC-002.39 — the central server own site cannot be deleted', () => {
  it('maps the typed CannotDeleteCentralSite rejection to its own report reason', () => {
    expect(deleteOutcome(1, typedError('CannotDeleteCentralSite'))).toEqual({
      kind: 'refused',
      id: 1,
      reason: 'centralSite',
    });
  });
});

describe('OMS-FUN-SYC-002.40 — a bulk delete removes every deletable site in the selection and reports each refusal by site name', () => {
  it('is per-site, not atomic: the deletable ones go and the rest are reported', () => {
    const summary = summariseOutcomes([
      deleteOutcome(2, deleted(2)),
      deleteOutcome(4, typedError('SiteHasStores')),
      deleteOutcome(1, typedError('CannotDeleteCentralSite')),
      deleteOutcome(3, deleted(3)),
    ]);
    expect(summary.deletedCount).toBe(2);
    // One report line per refusal, in selection order, each addressable by id →
    // name in the dialog.
    expect(summary.refused).toEqual([
      { kind: 'refused', id: 4, reason: 'hasStores' },
      { kind: 'refused', id: 1, reason: 'centralSite' },
    ]);
    expect(allDeleted(summary)).toBe(false);
  });

  it('needs no report when every selected site went', () => {
    const summary = summariseOutcomes([
      deleteOutcome(2, deleted(2)),
      deleteOutcome(3, deleted(3)),
    ]);
    expect(summary).toEqual({ deletedCount: 2, refused: [] });
    expect(allDeleted(summary)).toBe(true);
  });

  it('degrades an UNTYPED refusal to a reported line, not a global error', () => {
    // SiteDoesNotExist and NotStandaloneCentral carry no union member: they
    // arrive as a top-level "Bad user input" with the variant in
    // extensions.details (contract.md wire trap). Taken back per call so one
    // refusal cannot trip the app-level error modal mid-bulk.
    const untyped: GraphqlResult<DeleteSiteResult> = {
      kind: 'graphqlError',
      message: 'Bad user input: SiteDoesNotExist',
      errors: [
        {
          message: 'Bad user input',
          extensions: { details: 'SiteDoesNotExist' },
        },
      ],
    };
    expect(deleteOutcome(99, untyped)).toEqual({
      kind: 'refused',
      id: 99,
      reason: 'other',
    });
  });
});
