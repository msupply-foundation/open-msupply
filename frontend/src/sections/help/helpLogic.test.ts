import { describe, expect, it } from 'vitest';
import {
  canSendContactForm,
  helpDocumentFileUrl,
  isValidEmail,
  showableDocuments,
  userGuideUrl,
} from './helpLogic';

describe('helpLogic — Help page (spec/help S1)', () => {
  // OMS-REG-HLP-01.17 — user guide opens the public docs introduction,
  // localised for es/fr, default otherwise (pt is implemented ahead of the
  // case — see BUILD_REPORT.md).
  it('user-guide URL localises for es/fr(+fr-DJ)/pt, default otherwise (HLP-01.17)', () => {
    expect(userGuideUrl('en')).toBe(
      'https://docs.msupply.foundation/docs/introduction/introduction'
    );
    expect(userGuideUrl('es')).toBe(
      'https://docs.msupply.foundation/es/docs/introduction/introduction'
    );
    expect(userGuideUrl('fr')).toBe(
      'https://docs.msupply.foundation/fr/docs/introduction/introduction'
    );
    expect(userGuideUrl('fr-DJ')).toBe(
      'https://docs.msupply.foundation/fr/docs/introduction/introduction'
    );
    // ar (RTL, no translated docs site) falls back to the default site
    expect(userGuideUrl('ar')).toBe(
      'https://docs.msupply.foundation/docs/introduction/introduction'
    );
  });

  // OMS-REG-HLP-01.18/.19 — the documents block skips fileless documents (and
  // hides entirely when none are showable — the caller gates on the returned
  // length).
  it('showable documents are exactly those with a file (HLP-01.18/.19)', () => {
    const docs = [
      { id: 'a', files: { nodes: [{ id: 'f1' }] } },
      { id: 'b', files: { nodes: [] } }, // fileless → absent
      { id: 'c', files: null }, // no files → absent
      { id: 'd', files: { nodes: [{ id: 'f2' }] } },
    ];
    expect(showableDocuments(docs).map(d => d.id)).toEqual(['a', 'd']);
    // none showable → empty → the block hides
    expect(showableDocuments([{ id: 'x', files: { nodes: [] } }])).toEqual([]);
  });

  it('file view URL is the sync-files help_document route (HLP-01.20)', () => {
    expect(helpDocumentFileUrl('https://host:8890', 'doc1', 'file1')).toBe(
      'https://host:8890/sync_files/help_document/doc1/file1'
    );
  });
});

describe('helpLogic — contact form (spec/help S1)', () => {
  // OMS-REG-HLP-01.23 — client email format check.
  it('email format check (HLP-01.23)', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('  a@b.co  ')).toBe(true); // trimmed
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false); // no TLD dot
    expect(isValidEmail('')).toBe(false);
  });

  // OMS-REG-HLP-01.2-.7 — Send enabled iff email valid AND message non-empty;
  // disabled whenever either stops holding.
  it('send-gating requires a valid email and a non-empty message (HLP-01.2-.7)', () => {
    expect(canSendContactForm('a@b.co', 'hello')).toBe(true);
    expect(canSendContactForm('a@b.co', '   ')).toBe(false); // blank message
    expect(canSendContactForm('bad', 'hello')).toBe(false); // bad email
    expect(canSendContactForm('', '')).toBe(false); // fresh form
  });
});
