import { beforeAll, describe, expect, it } from 'vitest';
import {
  confirmDeleteMessage,
  type DocumentFile,
} from './DocumentUploadPanel';
import { setDictionaries, setLocale } from '../../../intl/intl';
import commonEn from '../../../intl/locales/en/common.json';

// Anchors: spec/purchase-orders/cases/OMS-FUN-PO-04.
//   .29 — an earlier version is removable on the same terms as the latest
//   .30 — removing the latest version makes the one beneath it current
// The wording is what tells the user which of those two happens, so it is
// asserted here rather than left to the dialog.

// Through the real catalog: the wording is the assertion, so the interpolated
// numbers have to be the real ones.
beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});

const version = (number: number): DocumentFile => ({
  id: `v${number}`,
  fileName: 'po.pdf',
  version: number,
});

const latest: DocumentFile = {
  ...version(3),
  previousVersions: [version(2), version(1)],
};

describe('confirmDeleteMessage', () => {
  it('.30 names the version that goes and the one that becomes current', () => {
    const message = confirmDeleteMessage(
      { document: latest, earlierVersion: false },
      true
    );
    // The one that becomes current is read from the list, not counted down
    // from the number, so the panel presents whatever numbers it is given.
    expect(message).toBe(
      'This will remove version 3 of this document. Version 2 becomes the current one.'
    );
  });

  it('.29 names only the version itself when an earlier one is removed', () => {
    const message = confirmDeleteMessage(
      { document: version(2), earlierVersion: true },
      true
    );
    expect(message).toBe('This will remove version 2 of this document.');
  });

  it('speaks of the document, not a version, where there is only one', () => {
    const message = confirmDeleteMessage(
      { document: version(1), earlierVersion: false },
      true
    );
    expect(message).toBe('This will remove this document.');
  });

  it('speaks of the document on a plain, unversioned list', () => {
    // Same row, `versioned` off: no version is on offer to name.
    const message = confirmDeleteMessage(
      { document: latest, earlierVersion: false },
      false
    );
    expect(message).toBe('This will remove this document.');
  });

  it('speaks of the document when a versioned row carries no number', () => {
    const message = confirmDeleteMessage(
      { document: { id: 'a', fileName: 'po.pdf' }, earlierVersion: false },
      true
    );
    expect(message).toBe('This will remove this document.');
  });

  it('answers for no pending row at all', () => {
    expect(confirmDeleteMessage(undefined, true)).toBe(
      'This will remove this document.'
    );
  });
});
