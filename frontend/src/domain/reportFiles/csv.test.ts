import { describe, expect, it } from 'vitest';
import { parseCsv, readCsvFile, sniffSeparator, toCsv } from './csv';

/*
 * The reader's separator handling. We WRITE commas, but a spreadsheet does not
 * read our files back that way — Excel uses the machine's list separator, `;`
 * on many Windows locales — so a file the user believes is the one we gave them
 * comes back semicolon-delimited.
 */
describe('the separator is sniffed from the header line', () => {
  it('reads a comma file, as it always did', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('reads a semicolon file — what Excel saves under many Windows locales', () => {
    expect(parseCsv('a;b\n1;2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('reads a tab file', () => {
    expect(parseCsv('a\tb\n1\t2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('decides from the HEADER, so a comma inside a later cell cannot flip it', () => {
    // Semicolon-delimited, and one cell legitimately contains commas.
    expect(parseCsv('name;notes\nfridge;"big, cold, loud"\n')).toEqual([
      ['name', 'notes'],
      ['fridge', 'big, cold, loud'],
    ]);
  });

  it('leaves a semicolon inside a comma file alone', () => {
    expect(parseCsv('name,notes\nfridge,"a; b; c"\n')).toEqual([
      ['name', 'notes'],
      ['fridge', 'a; b; c'],
    ]);
  });

  it('stays a comma when the header carries no separator at all', () => {
    expect(parseCsv('solo\nvalue\n')).toEqual([['solo'], ['value']]);
  });

  it('looks past a title line a user typed above the heading', () => {
    // A single cell carries no separator, so deciding on it would read the
    // whole file as one column. The first line that HAS one decides.
    expect(parseCsv('Equipment export\r\na;b;c\r\n1;2;3\r\n')).toEqual([
      ['Equipment export'],
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
    expect(sniffSeparator('Equipment export\r\na;b;c')).toBe(';');
  });

  it('does not look past the opening few lines', () => {
    const padding = Array(5).fill('solo').join('\n');
    expect(sniffSeparator(`${padding}\na;b;c`)).toBe(',');
  });

  it('honours an explicit separator over the sniff', () => {
    expect(parseCsv('a;b\n1;2\n', ',')).toEqual([['a;b'], ['1;2']]);
  });

  it('still handles quotes, CRLF and a BOM', () => {
    expect(parseCsv('﻿a;b\r\n"x;1";"he said ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x;1', 'he said "hi"'],
    ]);
  });

  it('round-trips what toCsv writes', () => {
    const text = toCsv(['a', 'b'], [['1', 'x,y']]);
    expect(parseCsv(text)).toEqual([
      ['a', 'b'],
      ['1', 'x,y'],
    ]);
  });
});

/*
 * Encoding. `File.text()` always decodes UTF-8, and Excel on Windows does not
 * write UTF-8 — it writes the machine's legacy code page. One accented
 * character in a name or a note is all it takes.
 */
describe('a CSV is read in the encoding it was saved in', () => {
  const blobOf = (bytes: number[]) => new Blob([new Uint8Array(bytes)]);

  it('reads UTF-8, including multi-byte characters', async () => {
    const text = 'name,note\nCoût,Frigorífico\n';
    expect(await readCsvFile(new Blob([text]))).toBe(text);
  });

  it('reads windows-1252, which is what Excel on Windows saves', async () => {
    // "Coût" as cp1252: û is a single byte 0xFB, which is not valid UTF-8.
    const bytes = [0x43, 0x6f, 0xfb, 0x74];
    expect(await readCsvFile(blobOf(bytes))).toBe('Coût');
  });

  it('does not mistake plain ASCII for the legacy code page', async () => {
    expect(await readCsvFile(blobOf([0x61, 0x2c, 0x62]))).toBe('a,b');
  });

  it('falls back to the code page the caller names — a Russian file is windows-1251', async () => {
    // "Лаб" as cp1251. Under windows-1252 the same bytes read "Ëàá", with no
    // error to say so — which is why the fallback follows the language rather
    // than being sniffed (intl § legacyCodePage).
    const bytes = [0xcb, 0xe0, 0xe1];
    expect(await readCsvFile(blobOf(bytes), 'windows-1251')).toBe('Лаб');
    expect(await readCsvFile(blobOf(bytes), 'windows-1252')).toBe('Ëàá');
  });

  it('defaults the fallback to the current language (English → windows-1252)', async () => {
    expect(await readCsvFile(blobOf([0x43, 0x6f, 0xfb, 0x74]))).toBe('Coût');
  });
});
