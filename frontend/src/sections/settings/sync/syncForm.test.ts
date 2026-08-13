import { describe, expect, it } from 'vitest';
import {
  buildSyncInput,
  canSaveSyncSettings,
  initialSyncForm,
  normaliseBatchSize,
  normaliseInterval,
  SYNC_SAVE_FALLBACK_ERROR,
  syncSaveErrorKey,
} from './syncForm';

const filled = {
  url: 'https://central.example',
  username: 'site-1',
  password: 'secret',
  intervalSeconds: 300,
  batchSize: undefined,
};

// OMS-REG-SET-02.7/.8 — Save disabled until all fields are filled: any one of
// URL, site, password, or interval empty keeps Save disabled.
describe('save disabled until all four fields are filled (SET-02.7/.8)', () => {
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

// OMS-REG-SET-02.12 — Password always starts blank: seeding the form from
// existing settings pre-fills url/site/interval but never the password (the
// query cannot return it — the server stores only a hash).
describe('password always starts blank (SET-02.12)', () => {
  it('pre-fills url, site, interval, and batch size from stored settings, password empty', () => {
    expect(
      initialSyncForm({
        url: 'https://central.example',
        username: 'site-1',
        intervalSeconds: 60,
        batchSize: 50,
      })
    ).toEqual({
      url: 'https://central.example',
      username: 'site-1',
      password: '',
      intervalSeconds: 60,
      batchSize: 50,
    });
  });

  it('starts fully blank with no settings recorded yet', () => {
    expect(initialSyncForm(null)).toEqual({
      url: '',
      username: '',
      password: '',
      intervalSeconds: undefined,
      batchSize: undefined,
    });
  });
});

// OMS-REG-SET-02.15/.16 — the batch size is an OPTIONAL override: empty means
// "use the server's own default", so it never gates Save and is sent as null
// (rules § Synchronisation).
describe('batch size is an optional override (SET-02.15/.16)', () => {
  it('leaves Save enabled with no batch size entered', () => {
    expect(canSaveSyncSettings({ ...filled, batchSize: undefined })).toBe(true);
  });

  it('leaves the field empty when the server reports no override', () => {
    expect(
      initialSyncForm({
        url: 'https://central.example',
        username: 'site-1',
        intervalSeconds: 60,
        batchSize: null,
      }).batchSize
    ).toBeUndefined();
  });

  it('sends null for an empty field', () => {
    expect(buildSyncInput({ ...filled, batchSize: undefined }).batchSize).toBe(
      null
    );
    expect(normaliseBatchSize(undefined)).toBe(null);
  });

  it('sends a whole positive number for an entered value', () => {
    expect(buildSyncInput({ ...filled, batchSize: 20 }).batchSize).toBe(20);
    expect(normaliseBatchSize(20.4)).toBe(20);
  });

  it('never sends a non-positive size — the server rejects zero', () => {
    expect(normaliseBatchSize(0)).toBe(null);
    expect(normaliseBatchSize(-5)).toBe(null);
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

// OMS-REG-SET-02.9 — a failed save shows a reason-specific message resolved
// from the returned sync error variant; unstructured failures fall back to
// error.unable-to-save-settings (ui-surface § Synchronisation).
describe('failure messages name the reason (SET-02.9)', () => {
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
