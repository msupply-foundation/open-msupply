import { describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import { rejectionFrom } from './rejection';

// Anchors: spec/stock-movements/cases/OMS-REG-SMV-10 (.26, .28, .30),
// spec/rnr-forms/cases/OMS-REG-REPL-07 (.47).
//
// The refusal copy IS the behaviour here, so these need a real dictionary —
// seeded directly, as shortcuts.test.ts does. Without it translateServerError
// falls back to sentence-casing the identifier and every assertion below would
// pass against "Relocation Already Finalised", proving nothing.
setDictionaries({ en: commonEn });
setLocale('en');

const GENERIC = 'You cannot delete one or more of the selected items';

const error = (details?: string, message = 'Bad user input') => [
  { message, ...(details === undefined ? {} : { extensions: { details } }) },
];

describe('OMS-REG-SMV-10.28/.30 — a finalised stock movement cannot be deleted, and the refusal says which', () => {
  it.each([
    ['RelocationAlreadyFinalised', 'finalised'],
    ['RelocationDoesNotExist', 'no longer exists'],
    ['NotThisStoreRelocation', 'another store'],
  ])('names %s rather than a blanket refusal', (variant, cue) => {
    // Every delete refusal this mutation raises is a unit variant, so its
    // pretty-debug IS the bare name on one line (server
    // graphql/stock_relocation → mutations/delete.rs `map_error`).
    const rejection = rejectionFrom(error(variant), GENERIC);
    expect(rejection.message).toContain(cue);
    // The reason IS the message, so there is no raw text left to hide behind a
    // disclosure.
    expect(rejection.detail).toBeUndefined();
  });
});

describe('OMS-REG-SMV-10.26 — a finalised movement rejects line deletes, naming the document', () => {
  it.each([
    ['StockRelocationFinalised', 'finalised'],
    ['LineDoesNotExist', 'no longer exists'],
  ])('names %s, recovered through the batch mutation', (variant, cue) => {
    // A line delete rides batchStockRelocationLine, which propagates the line's
    // own delete error unchanged (mutations/line/batch.rs → line/delete.rs).
    expect(rejectionFrom(error(variant), GENERIC).message).toContain(cue);
  });
});

describe('OMS-REG-REPL-07.47 — a finalised R&R form cannot be deleted, with a clear message', () => {
  it('names the finalised form instead of "Something went wrong"', () => {
    // The delete path's variants differ in name from update/finalise's
    // (contract § deleting) — CannotEditRnRForm is the finalised one.
    expect(rejectionFrom(error('CannotEditRnRForm'), GENERIC)).toEqual({
      message: "This R&R form is finalised, so it can't be edited or deleted",
    });
  });
});

describe('what the reader does with everything else', () => {
  it('sentence-cases a variant with no translation rather than leaking the identifier', () => {
    expect(rejectionFrom(error('SomeUnmappedRejection'), GENERIC)).toEqual({
      message: 'Some Unmapped Rejection',
    });
  });

  it('keeps a multi-line dump out of the message and behind the disclosure', () => {
    // A variant carrying data pretty-debugs as a struct spanning lines, which
    // is not user copy — but it is the only account of what happened, so it
    // survives for the disclosure.
    const dump =
      'LineError {\n    line_id: "abc",\n    error: SomethingElse,\n}';
    expect(rejectionFrom(error(dump), GENERIC)).toEqual({
      message: GENERIC,
      detail: dump,
    });
  });

  it('lets a caller recover a variant nested in a dump', () => {
    const dump = 'Outer {\n    error: BatchIsReserved,\n}';
    expect(
      rejectionFrom(error(dump), GENERIC, detail =>
        detail.includes('BatchIsReserved') ? 'BatchIsReserved' : undefined
      ).message
    ).toContain('issued or reserved');
  });

  it('falls back to the error message when the server sent no details', () => {
    expect(rejectionFrom(error(undefined, 'Bad user input'), GENERIC)).toEqual({
      message: 'Bad user input',
    });
  });

  it('treats empty details as absent', () => {
    expect(rejectionFrom(error('', 'Bad user input'), GENERIC)).toEqual({
      message: 'Bad user input',
    });
  });

  it('has something to say even when handed nothing at all', () => {
    expect(rejectionFrom([], GENERIC)).toEqual({ message: 'Unknown Error' });
  });

  it('reads only the first error, the one the refusal is about', () => {
    expect(
      rejectionFrom(
        [
          {
            message: 'Bad user input',
            extensions: { details: 'RelocationAlreadyFinalised' },
          },
          {
            message: 'Bad user input',
            extensions: { details: 'RelocationDoesNotExist' },
          },
        ],
        GENERIC
      ).message
    ).toContain('finalised');
  });
});
