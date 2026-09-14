import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';

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
