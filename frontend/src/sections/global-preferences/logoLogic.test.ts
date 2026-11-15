import { describe, expect, it } from 'vitest';
import {
  asLogo,
  LOGO_ACCEPT,
  logoDataUrl,
  logoMimeType,
  MAX_LOGO_DATA_URL_LENGTH,
  MAX_LOGO_FILE_BYTES,
} from './logoLogic';

describe('logoMimeType', () => {
  it('keeps a reported type the server accepts', () => {
    expect(logoMimeType({ name: 'logo.png', type: 'image/png' })).toBe(
      'image/png'
    );
    expect(logoMimeType({ name: 'logo', type: 'image/svg+xml' })).toBe(
      'image/svg+xml'
    );
  });

  it('falls back to the extension when no usable type is reported', () => {
    expect(logoMimeType({ name: 'LOGO.JPG', type: '' })).toBe('image/jpeg');
    expect(logoMimeType({ name: 'logo.jpeg', type: 'image/pjpeg' })).toBe(
      'image/jpeg'
    );
  });

  it('refuses any other type', () => {
    expect(logoMimeType({ name: 'logo.webp', type: 'image/webp' })).toBe(
      undefined
    );
    expect(logoMimeType({ name: 'notes.txt', type: 'toString' })).toBe(
      undefined
    );
  });
});

describe('logoDataUrl', () => {
  it('re-prefixes the payload with the given type', () => {
    expect(logoDataUrl('data:;base64,iVBORw0KGgo=', 'image/png')).toBe(
      'data:image/png;base64,iVBORw0KGgo='
    );
  });

  it('accepts a full-size file and refuses a value too long to store', () => {
    // A file at the cap still fits once base64-encoded.
    const atCap = 'A'.repeat(Math.ceil(MAX_LOGO_FILE_BYTES / 3) * 4);
    expect(logoDataUrl(`data:;base64,${atCap}`, 'image/svg+xml')).toBeDefined();

    const tooLong = 'A'.repeat(MAX_LOGO_DATA_URL_LENGTH);
    expect(logoDataUrl(`data:;base64,${tooLong}`, 'image/png')).toBe(undefined);
  });
});

describe('logoDataUrl with no payload', () => {
  it('returns empty for an empty file, so it is refused rather than stored', () => {
    expect(logoDataUrl('data:', 'image/png')).toBe('');
    expect(logoDataUrl('data:image/png;base64,', 'image/png')).toBe('');
  });
});

describe('LOGO_ACCEPT', () => {
  it('lists every accepted type and extension', () => {
    expect(LOGO_ACCEPT.split(',')).toEqual([
      'image/png',
      '.png',
      'image/jpeg',
      '.jpg',
      '.jpeg',
      'image/gif',
      '.gif',
      'image/svg+xml',
      '.svg',
    ]);
  });
});

describe('asLogo', () => {
  it('reads a stored data URL, and anything else as not set', () => {
    expect(asLogo('data:image/png;base64,AA==')).toBe(
      'data:image/png;base64,AA=='
    );
    expect(asLogo(null)).toBe('');
    expect(asLogo({})).toBe('');
  });
});
