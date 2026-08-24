import { describe, expect, it } from 'vitest';
import type { GraphqlErrorItem } from '@/api/graphql';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import { deleteRejection } from './deleteRejection';

// Anchors: spec/inbound-shipments/cases/OMS-REG-REPL-01 (.32),
// spec/customer-returns/cases/OMS-REG-DIST-07 (.58).
//
// The refusal copy IS the behaviour here, so these need a real dictionary —
// seeded directly, as shortcuts.test.ts does. Without it translateServerError
// falls back to sentence-casing the identifier and every assertion below would
// pass against "Batch Is Reserved", proving nothing.
setDictionaries({ en: commonEn });
setLocale('en');

const error = (details?: string, message = 'Internal error') => [
  { message, ...(details === undefined ? {} : { extensions: { details } }) },
];

// How a per-line lock actually arrives: the mutation maps LineDeleteError to an
// internal error, and the only trace of the cause is the Rust pretty-debug dump
// in extensions.details. Reproduced with its real shape — indented, multi-line,
// the variant nested inside the wrapper — because the single-line/multi-line
// split is exactly what the parsing turns on.
const lineLockDump = (variant: string) =>
  [
    'LineDeleteError {',
    '    line_id: "0a1b2c3d-4e5f-6789-abcd-ef0123456789",',
    `    error: ${variant},`,
    '}',
  ].join('\n');

describe('OMS-REG-REPL-01.32 — deleting a Verified shipment is refused, and the reason names the finalised status', () => {
  it('translates a bare single-line variant name', () => {
    expect(deleteRejection(error('BackdatingNotEnabled'))).toEqual({
      message: 'Backdating is not enabled for this store',
    });
  });

  it('KNOWN GAP: the finalised refusal has no translation and says "edit"', () => {
    // CannotEditFinalised is what all five invoice verticals return for a
    // delete of a finalised record (server invoice/*/delete/validate.rs), so
    // this is the delete refusal users hit most — and there is no
    // `server-error.CannotEditFinalised`, so it renders as the sentence-cased
    // identifier, naming the wrong verb. Pinned so the copy fix breaks this
    // deliberately rather than passing unnoticed.
    expect(deleteRejection(error('CannotEditFinalised'))).toEqual({
      message: 'Cannot Edit Finalised',
    });
  });

  it('sentence-cases a variant with no translation rather than leaking the identifier', () => {
    expect(deleteRejection(error('SomeUnmappedRejection'))).toEqual({
      message: 'Some Unmapped Rejection',
    });
  });

  it('falls back to the error message when the server sent no details', () => {
    expect(deleteRejection(error(undefined, 'Bad user input'))).toEqual({
      message: 'Bad user input',
    });
  });

  it('treats empty details as absent', () => {
    expect(deleteRejection(error('', 'Bad user input'))).toEqual({
      message: 'Bad user input',
    });
  });

  it('has something to say even when handed nothing at all', () => {
    // Also untranslated, but this one is a can't-happen backstop rather than a
    // refusal a user is meant to read.
    expect(deleteRejection([])).toEqual({ message: 'Unknown Error' });
  });
});

describe('OMS-REG-DIST-07.58 — a record whose stock has been issued, reserved, or counted is refused with that cause named', () => {
  it.each([
    ['BatchIsReserved', 'issued or reserved'],
    ['LineUsedInStocktake', 'stocktake'],
    ['LineLinkedToTransferredInvoice', 'stock transfer'],
    ['CannotDeleteLinesOfAuthorisedReceivedInvoice', 'authorised'],
  ])('recovers %s from the debug dump and names the cause', (variant, cue) => {
    const rejection = deleteRejection(error(lineLockDump(variant)));
    expect(rejection.message).toContain(cue);
    // The recovered cause IS the message, so there is no raw text left to hide
    // behind a disclosure.
    expect(rejection.detail).toBeUndefined();
  });

  it('states the cause about the record, never about a line', () => {
    // The one defect this copy was rewritten for: the server variants are named
    // "Line…", but this path is only ever reached by deleting a WHOLE shipment
    // or return, so a line is not something the user acted on or can act on.
    for (const variant of [
      'BatchIsReserved',
      'LineUsedInStocktake',
      'LineLinkedToTransferredInvoice',
      'CannotDeleteLinesOfAuthorisedReceivedInvoice',
    ]) {
      const { message } = deleteRejection(error(lineLockDump(variant)));
      expect(message).not.toMatch(/\bline\b/i);
      expect(message).toContain("can't be deleted");
    }
  });

  it('prefers the widest cause when a dump names more than one', () => {
    // Ordering is load-bearing, not incidental: a dump carrying both reports
    // the reserved stock, which is the cause the user can actually act on.
    const both = `${lineLockDump('LineUsedInStocktake')}\n${lineLockDump(
      'BatchIsReserved'
    )}`;
    expect(deleteRejection(error(both)).message).toContain(
      'issued or reserved'
    );
  });

  it('reads the variant wherever it sits in the dump, not just at a line start', () => {
    expect(
      deleteRejection(error('Outer { inner: BatchIsReserved }\n}')).message
    ).toContain('issued or reserved');
  });

  it('keeps an unrecognised dump out of the message and behind the disclosure', () => {
    // A dump is not user copy, so it never becomes the message — but it is the
    // only account of what happened, so it must survive for the disclosure.
    const dump = lineLockDump('SomeVariantWeHaveNeverSeen');
    expect(deleteRejection(error(dump))).toEqual({
      message: 'You cannot delete one or more of the selected items',
      detail: dump,
    });
  });

  it('reads only the first error, the one the refusal is about', () => {
    const errors: GraphqlErrorItem[] = [
      {
        message: 'Internal error',
        extensions: { details: 'BackdatingNotEnabled' },
      },
      {
        message: 'Internal error',
        extensions: { details: 'CannotEditFinalised' },
      },
    ];
    expect(deleteRejection(errors).message).toBe(
      'Backdating is not enabled for this store'
    );
  });
});
