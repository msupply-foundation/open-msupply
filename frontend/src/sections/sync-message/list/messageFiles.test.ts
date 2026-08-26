import { describe, expect, it } from 'vitest';
import { syncFileUrl } from '@/domain/syncFiles';
import {
  SYNC_MESSAGE_TABLE,
  fileErrorNotice,
  filesInNameOrder,
  messageErrorNotice,
  producesArtefacts,
  showFilesSection,
} from './messageFiles';
import type {
  SyncMessageFileFragment,
  SyncMessageRowFragment,
} from './syncMessages.generated';

// Anchors: spec/sync-message/cases/OMS-REG-MNG-05.
//   .19 — a logs support upload lists one attached file per server log file,
//         current and rotated, in FILE-NAME order
//   .20 — a support upload asking for no artefacts shows NO Files section
//   .21 — a message the receiving site cannot act on records a reason, shown
//         as an error notice in the message modal
//   .22 — each attached file opens from the message in a new context
//   .23 — a failed file shows its own reason WITHOUT changing the message's
//         own Processed status
//   .24 — a database snapshot asked of a site that cannot produce one fails
//         the whole message and produces no files
// (rules.md § attached files, § lifecycle, § the support-upload harvest.)

const file = (
  over: Partial<SyncMessageFileFragment> = {}
): SyncMessageFileFragment => ({
  id: 'f1',
  fileName: 'remote_server.log',
  status: 'NEW',
  error: null,
  ...over,
});

const message = (
  over: Partial<SyncMessageRowFragment> = {}
): SyncMessageRowFragment => ({
  id: 'm1',
  fromStore: { id: 's1', storeName: 'Tamaki Central Medical Store' },
  toStore: { id: 's1', storeName: 'Tamaki Central Medical Store' },
  body: '{"logs":true,"database":false}',
  createdDatetime: '2026-08-10T00:00:00Z',
  status: 'processed',
  type: 'supportUpload',
  errorMessage: null,
  ...over,
});

describe('OMS-REG-MNG-05.19 — harvested files read as a sequence', () => {
  it('lists the current log and its rotated history in file-name order', () => {
    const harvested = [
      file({ id: 'b', fileName: 'remote_server.log.2.gz' }),
      file({ id: 'a', fileName: 'remote_server.log' }),
      file({ id: 'c', fileName: 'remote_server.log.1.gz' }),
    ];
    expect(filesInNameOrder(harvested).map(f => f.fileName)).toEqual([
      'remote_server.log',
      'remote_server.log.1.gz',
      'remote_server.log.2.gz',
    ]);
  });

  it('does not mutate the list it was handed', () => {
    const harvested = [file({ fileName: 'b' }), file({ fileName: 'a' })];
    filesInNameOrder(harvested);
    expect(harvested.map(f => f.fileName)).toEqual(['b', 'a']);
  });

  it('shows the Files section once a support upload has produced any', () => {
    expect(showFilesSection('supportUpload', [file()])).toBe(true);
  });
});

describe('OMS-REG-MNG-05.20 — no artefacts, no Files section', () => {
  it('shows NO section for a support upload that produced none, rather than an empty one', () => {
    expect(showFilesSection('supportUpload', [])).toBe(false);
  });

  it('shows none for a kind that never produces artefacts — `files` answering with a totalCount-0 connector is NOT evidence of an artefact surface', () => {
    expect(producesArtefacts('requestFieldChange')).toBe(false);
    expect(producesArtefacts('other')).toBe(false);
    expect(showFilesSection('requestFieldChange', [file()])).toBe(false);
    expect(showFilesSection('other', [file()])).toBe(false);
  });
});

describe('OMS-REG-MNG-05.21 — a recorded processing failure is shown', () => {
  it('shows the raw server reason verbatim on an errored message', () => {
    const reason =
      '(support upload) Failed to process support upload: Other error: (support upload): Invalid JSON in body: this is not json';
    expect(
      messageErrorNotice(message({ status: 'error', errorMessage: reason }))
    ).toBe(reason);
  });

  it('shows no notice while the message has not failed', () => {
    expect(
      messageErrorNotice(message({ status: 'processed' }))
    ).toBeUndefined();
    expect(messageErrorNotice(message({ status: 'new' }))).toBeUndefined();
  });

  it('shows no notice for an errored message with no reason recorded', () => {
    expect(
      messageErrorNotice(message({ status: 'error', errorMessage: null }))
    ).toBeUndefined();
  });
});

describe('OMS-REG-MNG-05.24 — a refused database snapshot fails the whole message', () => {
  it('reads as an errored message with its reason and NO files', () => {
    const refused = message({
      status: 'error',
      errorMessage:
        '(support upload) Failed to process support upload: Other error: database upload is only supported on sqlite sites',
      body: '{"logs":false,"database":true}',
    });
    expect(messageErrorNotice(refused)).toContain(
      'only supported on sqlite sites'
    );
    expect(showFilesSection(refused.type, [])).toBe(false);
  });
});

describe('OMS-REG-MNG-05.23 — a per-artefact failure is not a message failure', () => {
  it('shows the file’s own reason', () => {
    expect(fileErrorNotice(file({ error: 'upload timed out' }))).toBe(
      'upload timed out'
    );
    expect(fileErrorNotice(file({ error: null }))).toBeUndefined();
  });

  it('leaves the MESSAGE at Processed with no notice of its own', () => {
    const processed = message({ status: 'processed', errorMessage: null });
    const failed = file({ status: 'ERROR', error: 'upload timed out' });
    expect(messageErrorNotice(processed)).toBeUndefined();
    expect(fileErrorNotice(failed)).toBe('upload timed out');
    // …and the file list is still shown, since that is the only place the
    // per-artefact failure is visible.
    expect(showFilesSection(processed.type, [failed])).toBe(true);
  });
});

describe('OMS-REG-MNG-05.22 — a file opens from the message', () => {
  it('addresses the sync-file endpoint by table, message id and file id — not through the register’s own data', () => {
    expect(syncFileUrl(SYNC_MESSAGE_TABLE, 'm1', 'f1')).toBe(
      '/sync_files/sync_message/m1/f1'
    );
  });
});
