import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bytesToBase64,
  mimeOf,
  openBlob,
  openDocument,
  sanitizeFileName,
  saveBlob,
} from './openDocument';

describe('openDocument (web path)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hands the URL to the browser and reports ok', async () => {
    const open = vi.fn();
    // A browser window without Capacitor: the web fork, no plugin involved.
    vi.stubGlobal('window', { open });

    const result = await openDocument('/sync_files/invoice/abc/f1', 'a.pdf');

    expect(result).toEqual({ ok: true });
    expect(open).toHaveBeenCalledWith(
      '/sync_files/invoice/abc/f1',
      '_blank',
      'noreferrer'
    );
  });

  it('never fetches on the web path (plugins stay untouched)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('window', { open: vi.fn() });
    vi.stubGlobal('fetch', fetchSpy);

    await openDocument('/sync_files/invoice/abc/f1', 'a.pdf');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('openBlob (web path)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('triggers a browser download via a temporary anchor and reports ok', async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { href: '', download: '', click, remove };
    const appendChild = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: { appendChild },
    });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const result = await openBlob(
      new Blob(['a,b\n1,2'], { type: 'text/csv' }),
      'export.csv'
    );

    expect(result).toEqual({ ok: true });
    expect(anchor.href).toBe('blob:fake');
    expect(anchor.download).toBe('export.csv');
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});

describe('saveBlob (web path)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is a browser download on the web — same affordance as openBlob', async () => {
    const click = vi.fn();
    const anchor = { href: '', download: '', click, remove: vi.fn() };
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    });

    const result = await saveBlob(new Blob(['x']), 'report.xlsx');

    expect(result).toEqual({ ok: true, saved: true });
    expect(anchor.download).toBe('report.xlsx');
    expect(click).toHaveBeenCalledOnce();
  });
});

describe('sanitizeFileName', () => {
  it('keeps ordinary names', () => {
    expect(sanitizeFileName('report 2026-07.pdf')).toBe('report 2026-07.pdf');
  });

  it('flattens path separators and reserved characters', () => {
    expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j.pdf')).toBe(
      'a_b_c_d_e_f_g_h_i_j.pdf'
    );
  });

  it('falls back for empty or directory-like names', () => {
    expect(sanitizeFileName('')).toBe('file');
    expect(sanitizeFileName('  ')).toBe('file');
    expect(sanitizeFileName('..')).toBe('file');
  });
});

describe('mimeOf', () => {
  it('strips parameters', () => {
    expect(mimeOf('application/pdf; charset=binary')).toBe('application/pdf');
  });

  it('passes a bare type through', () => {
    expect(mimeOf('image/png')).toBe('image/png');
  });

  it('falls back to octet-stream for a missing or empty header', () => {
    expect(mimeOf(null)).toBe('application/octet-stream');
    expect(mimeOf('')).toBe('application/octet-stream');
  });
});

describe('bytesToBase64', () => {
  it('encodes small payloads', () => {
    expect(bytesToBase64(new TextEncoder().encode('hello'))).toBe(
      btoa('hello')
    );
  });

  it('encodes payloads larger than one chunk (0x8000 bytes)', () => {
    const bytes = new Uint8Array(0x8000 + 17).fill(65);
    const expected = btoa('A'.repeat(0x8000 + 17));
    expect(bytesToBase64(bytes)).toBe(expected);
  });
});
