import { describe, expect, it } from 'vitest';
import { groupDocumentVersions } from './documentVersions';

// Anchors: spec/purchase-orders/cases/OMS-FUN-PO-04.
//   .28 — a file uploaded under a listed document's name is a new version of
//         it: one row, the new upload's version number, Modified = the new
//         upload, Created and Created by unchanged
//   .29 — a document's earlier versions are reachable from its row
//   .30 — removing a version leaves the others' numbers as they were: the
//         gap is real, and the highest remaining is current
//   .31 — a document names the user who attached it
// (rules.md § documents and the activity log.)

const doc = (
  id: string,
  fileName: string,
  versionNumber: number,
  createdDatetime: string,
  username?: string
) => ({
  id,
  fileName,
  versionNumber,
  createdDatetime,
  user: username ? { username } : null,
});

describe('groupDocumentVersions', () => {
  it('keeps a document with one upload as its own latest, created and modified together', () => {
    const only = doc('a', 'po.pdf', 1, '2026-09-01T10:00:00Z', 'alice');
    const [group] = groupDocumentVersions([only]);
    expect(group).toMatchObject({
      latest: only,
      previous: [],
      createdDatetime: '2026-09-01T10:00:00Z',
      modifiedDatetime: '2026-09-01T10:00:00Z',
      createdBy: 'alice',
      modifiedBy: 'alice',
    });
  });

  it('.28 folds same-named uploads into one document whose latest is the highest version', () => {
    const v1 = doc('a', 'po.pdf', 1, '2026-09-01T10:00:00Z', 'alice');
    const v2 = doc('b', 'po.pdf', 2, '2026-09-03T10:00:00Z', 'bob');
    const v3 = doc('c', 'po.pdf', 3, '2026-09-04T10:00:00Z', 'carol');
    const groups = groupDocumentVersions([v2, v1, v3]);
    expect(groups).toHaveLength(1);
    const [group] = groups;
    expect(group!.latest).toBe(v3);
    // Modified and Modified by move with the latest upload; Created and
    // Created by stay with the first.
    expect(group!.modifiedDatetime).toBe('2026-09-04T10:00:00Z');
    expect(group!.modifiedBy).toBe('carol');
    expect(group!.createdDatetime).toBe('2026-09-01T10:00:00Z');
    expect(group!.createdBy).toBe('alice');
  });

  it('.29 lists the earlier versions newest first, each under its own number', () => {
    const v1 = doc('a', 'po.pdf', 1, '2026-09-01T10:00:00Z');
    const v2 = doc('b', 'po.pdf', 2, '2026-09-02T10:00:00Z');
    const v3 = doc('c', 'po.pdf', 3, '2026-09-03T10:00:00Z');
    const [group] = groupDocumentVersions([v1, v2, v3]);
    expect(group!.previous).toEqual([v2, v1]);
  });

  it('.30 keeps the numbers of the remaining versions when one in the middle is removed', () => {
    const v1 = doc('a', 'po.pdf', 1, '2026-09-01T10:00:00Z');
    const v2 = doc('b', 'po.pdf', 2, '2026-09-02T10:00:00Z');
    const v4 = doc('d', 'po.pdf', 4, '2026-09-04T10:00:00Z');
    // Version 3 is gone: 1, 2, 4 stay 1, 2, 4 — 4 does not become 3.
    const [group] = groupDocumentVersions([v1, v2, v4]);
    // The row reads each version's OWN number, never its position, so the
    // gap survives into the list.
    expect(group!.latest).toBe(v4);
    expect(group!.previous.map(v => v.versionNumber)).toEqual([2, 1]);
  });

  it('.30 makes the highest remaining version current once the latest is gone', () => {
    const v1 = doc('a', 'po.pdf', 1, '2026-09-01T10:00:00Z', 'alice');
    const v2 = doc('b', 'po.pdf', 2, '2026-09-02T10:00:00Z', 'bob');
    const [before] = groupDocumentVersions([v1, v2]);
    expect(before!.latest).toBe(v2);
    const [after] = groupDocumentVersions([v1]);
    expect(after!.latest).toBe(v1);
    expect(after!.modifiedDatetime).toBe('2026-09-01T10:00:00Z');
  });

  it('orders by version number ahead of upload moment where both are known', () => {
    // A clock skew between sites can date a later version earlier; the
    // number, not the moment, says which is current.
    const v1 = doc('a', 'po.pdf', 1, '2026-09-05T10:00:00Z');
    const v2 = doc('b', 'po.pdf', 2, '2026-09-01T10:00:00Z');
    const [group] = groupDocumentVersions([v1, v2]);
    expect(group!.latest).toBe(v2);
    expect(group!.createdDatetime).toBe('2026-09-05T10:00:00Z');
  });

  it('keeps differently named files as separate documents, in first-seen order', () => {
    const a = doc('a', 'invoice.pdf', 1, '2026-09-01T10:00:00Z');
    const b = doc('b', 'po.pdf', 1, '2026-09-01T10:00:00Z');
    const a2 = doc('c', 'invoice.pdf', 2, '2026-09-02T10:00:00Z');
    const groups = groupDocumentVersions([a, b, a2]);
    expect(groups.map(group => group.latest.fileName)).toEqual([
      'invoice.pdf',
      'po.pdf',
    ]);
    expect(groups[0]!.latest).toBe(a2);
  });

  it('.31 leaves Created by blank for a document attached before uploaders were recorded', () => {
    const legacy = doc('a', 'po.pdf', 1, '2026-01-01T10:00:00Z');
    const [group] = groupDocumentVersions([legacy]);
    expect(group!.createdBy).toBeUndefined();
  });

  it('orders files carrying no version number by upload moment, then id', () => {
    // A fragment that does not read the number (another vertical's list)
    // still groups: no moment sorts first, and the id breaks a tie.
    // No number is invented for them — a position would contradict the
    // server's numbering.
    const undated = { id: 'z', fileName: 'po.pdf', createdDatetime: null };
    const dated = {
      id: 'a',
      fileName: 'po.pdf',
      createdDatetime: '2026-09-01T10:00:00Z',
    };
    const sameMoment = {
      id: 'b',
      fileName: 'po.pdf',
      createdDatetime: '2026-09-01T10:00:00Z',
    };
    const [group] = groupDocumentVersions([sameMoment, undated, dated]);
    expect(group!.latest).toBe(sameMoment);
    expect(group!.previous).toEqual([dated, undated]);
  });
});
