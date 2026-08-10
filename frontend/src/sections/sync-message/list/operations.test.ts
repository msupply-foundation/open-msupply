import { describe, expect, it } from 'vitest';
import * as operations from './syncMessages.generated';
import { buildInsertInput, EMPTY_FORM } from './syncMessageCreate';

// Anchors: spec/sync-message/cases/OMS-REG-MNG-04.
//   .16 — a message stays New until the site holding its destination store
//         next synchronises — CREATING it advances nothing
//   .17 — a message whose destination store is on another site stays New here
//   .18 — a message with no destination store stays New indefinitely
//   .25 — the register offers no row selection, no bulk action and no
//         per-record action
//   .26 — the message modal is wholly read-only
//   .27 — no surface offers a retry, re-send, edit or delete, in any status
// (rules.md § immutability, § lifecycle; contract.md § immutability.)
//
// .25–.27 are enforced HERE, at the vertical's wire surface: a screen cannot
// offer an action it has no operation for, and `insertSyncMessage` is the only
// sync-message mutation on the schema at all — there is no update, no delete,
// no retry and no re-send to call. .16–.18 are the receiving site's own
// behaviour (a processor gated on ITS sync run — see the report's C2 gaps);
// what this app owns, and what is asserted below, is that nothing it sends can
// advance a status.

// Every GraphQL document this vertical carries.
const documents = Object.entries(operations).filter(
  (entry): entry is [string, { query: string }] =>
    typeof entry[1] === 'object' && entry[1] !== null && 'query' in entry[1]
);

const documentText = documents.map(([, document]) => document.query).join('\n');

describe('OMS-REG-MNG-04.25/.26/.27 — nothing can be edited, retried or deleted', () => {
  it('carries exactly four operations — three reads and one write', () => {
    expect(documents.map(([name]) => name).sort()).toEqual([
      'InsertSyncMessage',
      'SyncMessageFiles',
      'SyncMessageStores',
      'SyncMessages',
    ]);
  });

  it('has ONE mutation, and it is the insert', () => {
    const mutations = documents.filter(([, document]) =>
      document.query.startsWith('mutation ')
    );
    expect(mutations.map(([name]) => name)).toEqual(['InsertSyncMessage']);
  });

  it('calls no update, delete, retry or re-send anywhere in its documents', () => {
    for (const forbidden of [
      'updateSyncMessage',
      'deleteSyncMessage',
      'retrySyncMessage',
      'resendSyncMessage',
    ]) {
      expect(documentText).not.toContain(forbidden);
    }
  });

  it('offers no upload or delete against the attached-file endpoint either — the artefacts are produced by the server, never by the user', () => {
    // The one sync-file call this vertical makes is the download URL builder
    // (messageFiles.test.ts); nothing here posts or deletes.
    expect(documentText).not.toContain('sync_files');
  });
});

describe('OMS-REG-MNG-04.16/.17/.18 — the client never advances a status', () => {
  it('sends no status on the create — the server stamps New', () => {
    expect(buildInsertInput(EMPTY_FORM, 'id-1')).not.toHaveProperty('status');
  });

  it('has no operation that could write a status at all', () => {
    expect(documentText).not.toContain('status:');
  });

  it('reads the status only as a field of the message', () => {
    expect(operations.SyncMessages.query).toContain('status');
  });
});
