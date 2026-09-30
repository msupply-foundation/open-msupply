import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createRoot } from 'solid-js';
import type { GraphqlResult } from '@/api/graphql';
import {
  refreshScanSources,
  setSourcesForTest,
  stopListening,
} from '@/platform/barcodeScanner';
import type {
  ScanHandlers,
  ScanSource,
} from '@/platform/barcodeSources/source';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';

// The equipment register's scan flow (spec/cold-chain-equipment › rules §
// scanning an asset) driven through the real scanner layer over a fake
// hardware source and a stubbed transport.

let answers: Record<string, GraphqlResult<unknown>> = {};
vi.mock('@/api/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@/api/graphql')>();
  return {
    ...actual,
    graphqlFetch: (document: { query: string }) => {
      const operation =
        /(query|mutation)\s+(\w+)/.exec(document.query)?.[2] ?? 'anonymous';
      const answer = answers[operation];
      if (!answer) throw new Error(`no stubbed answer for ${operation}`);
      return Promise.resolve(answer);
    },
  };
});

const { createAssetScan } = await import('./createAssetScan');

let handlers: ScanHandlers | undefined;
const hardware: ScanSource = {
  id: 'web-hid',
  displayName: () => 'hardware',
  continuous: true,
  available: async () => true,
  connected: () => true,
  scanOnce: async () => ({ ok: false, cancelled: false, message: 'no' }),
  listen: async h => {
    handlers = h;
    return { ok: true };
  },
  release: async () => {
    handlers = undefined;
  },
};

const settle = () => new Promise(resolve => setTimeout(resolve, 0));
let dispose: (() => void) | undefined;

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));
afterEach(async () => {
  dispose?.();
  dispose = undefined;
  await stopListening();
  setSourcesForTest([]);
  await refreshScanSources();
  setSourcesForTest();
  answers = {};
});

const mount = () =>
  createRoot(d => {
    dispose = d;
    return createAssetScan({ storeId: () => 'store', onOpen: () => {} });
  });
describe('scanning from the equipment register', () => {
  it('OMS-REG-CCE-04.39 a scan matching nothing says so in plain words, without the scanned content', async () => {
    answers = {
      assetById: { kind: 'success', data: { assets: { nodes: [] } } },
    };
    setSourcesForTest([hardware]);
    await refreshScanSources();
    const scan = mount();
    await settle();
    // The register waits to be pressed (ui-surface § R1).
    await scan.control.press();
    await settle();

    handlers?.onScan({ kind: 'text', text: 'FRIDGE-404' });
    await settle();
    expect(scan.notice()).toEqual({
      severity: 'error',
      text: 'No equipment found for this barcode.',
    });
    expect(scan.notice()?.text).not.toContain('FRIDGE-404');
  });
});
