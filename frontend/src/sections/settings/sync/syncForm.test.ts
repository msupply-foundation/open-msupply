import { describe, expect, it } from 'vitest';
import {
  buildSyncInput,
  canSaveSyncSettings,
  initialSyncForm,
  normaliseInterval,
  SYNC_SAVE_FALLBACK_ERROR,
  syncSaveErrorKey,
} from './syncForm';

const filled = {
  url: 'https://central.example',
  username: 'site-1',
  password: 'secret',
  intervalSeconds: 300,
};

// AC-SY1 — Save disabled until all fields are filled: any one of URL, site,
// password, or interval empty keeps Save disabled.
describe('AC-SY1 — save disabled until all four fields are filled', () => {
  it('enables save only when every field has a value', () => {
    expect(canSaveSyncSettings(filled)).toBe(true);
  });

  it.each([
    ['url', { ...filled, url: '' }],
    ['url (whitespace)', { ...filled, url: '   ' }],
    ['username', { ...filled, username: '' }],
    ['password', { ...filled, password: '' }],
    ['interval (empty)', { ...filled, intervalSeconds: undefined }],
    ['interval (zero)', { ...filled, intervalSeconds: 0 }],
  ])('stays disabled with %s missing', (_field, form) => {
    expect(canSaveSyncSettings(form)).toBe(false);
  });
});

// AC-SY2 — Password always starts blank: seeding the form from existing
// settings pre-fills url/site/interval but never the password (the query
// cannot return it — the server stores only a hash).
describe('AC-SY2 — password always starts blank', () => {
  it('pre-fills url, site, and interval from stored settings, password empty', () => {
    expect(
      initialSyncForm({
        url: 'https://central.example',
        username: 'site-1',
        intervalSeconds: 60,
      })
    ).toEqual({
      url: 'https://central.example',
      username: 'site-1',
      password: '',
      intervalSeconds: 60,
    });
  });

  it('starts fully blank with no settings recorded yet', () => {
    expect(initialSyncForm(null)).toEqual({
      url: '',
      username: '',
      password: '',
      intervalSeconds: undefined,
    });
  });
});

// rules § Synchronisation — the interval is rounded and floored to at least
// one whole second before it can be sent.
describe('interval normalisation (rules § Synchronisation)', () => {
  it('floors to a whole number of seconds', () => {
    expect(normaliseInterval(90.9)).toBe(90);
  });

  it('raises anything below one second to one', () => {
    expect(normaliseInterval(0.2)).toBe(1);
    expect(normaliseInterval(-5)).toBe(1);
  });

  it('is applied by the input builder', () => {
    expect(
      buildSyncInput({ ...filled, intervalSeconds: 0.5 }).intervalSeconds
    ).toBe(1);
  });
});

// AC-SY3 — a failed save shows a reason-specific message resolved from the
// returned sync error variant; unstructured failures fall back to
// error.unable-to-save-settings (ui-surface § Synchronisation).
describe('AC-SY3 — failure messages name the reason', () => {
  it('maps a V5/V6 error variant to its summary key', () => {
    expect(
      syncSaveErrorKey({
        __typename: 'SyncErrorNode',
        variant: 'INCORRECT_PASSWORD',
        fullError: 'bad password',
      })
    ).toBe('error.site-incorrect-password');
  });

  it('maps a V7 error variant to its summary key', () => {
    expect(
      syncSaveErrorKey({
        __typename: 'SyncErrorV7Node',
        variantV7: 'CONNECTION_ERROR',
        fullError: 'refused',
      })
    ).toBe('error.connection-error');
  });

  it('falls back to the generic settings-save error for unstructured failures', () => {
    expect(SYNC_SAVE_FALLBACK_ERROR).toBe('error.unable-to-save-settings');
  });
});
