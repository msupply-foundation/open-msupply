import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCEPTED_FILE_TYPES,
  FILE_FIELD,
  classifyResponse,
  importFridgeTag,
  importUrl,
  type ImportResponse,
} from './importFridgeTag';

// The fridge-sensor import's outcomes (spec/cold-chain-monitoring rules ›
// importing a fridge-sensor file), at the logic level: how a response is
// read, and what the request carries. The real-file leg — a genuinely valid
// fixture — belongs to the external temperature-sensor crate and is recorded
// in BUILD_REPORT.
// Anchors: spec/cold-chain-monitoring/cases/OMS-REG-CCE-02.

const response = (over: Partial<ImportResponse> = {}): ImportResponse => ({
  newSensorId: null,
  numberOfLogs: 0,
  numberOfBreaches: 0,
  startDatetime: null,
  endDatetime: null,
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe('the request', () => {
  it('posts to the fridge-tag route naming the active store', () => {
    expect(importUrl('B9AA2F86571D438EB9E53BB5BDA678A0')).toBe(
      '/fridge-tag?store-id=B9AA2F86571D438EB9E53BB5BDA678A0'
    );
    expect(importUrl('a b')).toBe('/fridge-tag?store-id=a%20b');
  });

  it('restricts the chooser to plain-text and comma-separated files', () => {
    expect(ACCEPTED_FILE_TYPES.split(',')).toEqual(['.txt', '.csv']);
  });

  it('sends the file as multipart under the route’s field, with the session cookie', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(
          JSON.stringify(response({ numberOfLogs: 3, numberOfBreaches: 1 })),
          { status: 200 }
        );
      })
    );
    const file = new File(['a,b,c'], 'Fridge-tag 2.txt', {
      type: 'text/plain',
    });
    await importFridgeTag('store-a', file);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('/fridge-tag?store-id=store-a');
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.credentials).toBe('same-origin');
    const body = calls[0]?.init.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get(FILE_FIELD)).toBeInstanceOf(File);
  });
});

describe('OMS-REG-CCE-02.34 — a valid file imports and reports its counts', () => {
  it('reads a response with readings or breaches as imported, counts intact', () => {
    const outcome = classifyResponse(
      response({
        newSensorId: 'sensor-new',
        numberOfLogs: 120,
        numberOfBreaches: 60,
        startDatetime: '2023-02-01T00:00:00.000Z',
        endDatetime: '2023-02-05T00:00:00.000Z',
      })
    );
    expect(outcome.kind).toBe('imported');
    if (outcome.kind === 'imported') {
      expect(outcome.response.numberOfLogs).toBe(120);
      expect(outcome.response.numberOfBreaches).toBe(60);
      expect(outcome.response.newSensorId).toBe('sensor-new');
    }
  });

  it('counts breaches alone, or readings alone, as an import', () => {
    expect(classifyResponse(response({ numberOfBreaches: 1 })).kind).toBe(
      'imported'
    );
    expect(classifyResponse(response({ numberOfLogs: 1 })).kind).toBe(
      'imported'
    );
  });

  it('is an import whether or not a sensor was created', () => {
    expect(
      classifyResponse(response({ numberOfLogs: 5, newSensorId: null })).kind
    ).toBe('imported');
  });
});

describe('OMS-REG-CCE-02.35 — a file yielding no logs and no breaches is a failure', () => {
  it('reads a zero-count 200 as empty, never as a success', () => {
    const outcome = classifyResponse(response());
    expect(outcome.kind).toBe('empty');
  });

  it('reads it as empty even when it created a sensor', () => {
    // The junk-file residue (contract ⚠️ wire trap): a sensor row and nothing
    // else. The user is still told no data was imported.
    expect(
      classifyResponse(response({ newSensorId: 'null-sensor' })).kind
    ).toBe('empty');
  });

  it('classifies the live 200 the same way through the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify(response()), { status: 200 })
      )
    );
    const outcome = await importFridgeTag(
      'store-a',
      new File([''], 'empty.txt')
    );
    expect(outcome.kind).toBe('empty');
  });
});

describe('OMS-REG-CCE-02.36 — an invalid file shows an alert carrying the reason', () => {
  it('surfaces a non-200 body verbatim as the reason', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('Error uploading or integrading fridge tag data', {
            status: 500,
          })
      )
    );
    const outcome = await importFridgeTag(
      'store-a',
      new File(['?'], 'bad.csv')
    );
    expect(outcome).toEqual({
      kind: 'failed',
      message: 'Error uploading or integrading fridge tag data',
    });
  });

  it('falls back to the status when the body is empty, and to the transport’s message when it rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 413 }))
    );
    expect(
      await importFridgeTag('store-a', new File(['?'], 'big.txt'))
    ).toEqual({
      kind: 'failed',
      message: 'HTTP 413',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Failed to fetch');
      })
    );
    expect(await importFridgeTag('store-a', new File(['?'], 'x.txt'))).toEqual({
      kind: 'failed',
      message: 'Failed to fetch',
    });
  });

  it('shares one observable outcome with .35 for content the server admits', () => {
    // No file content reaches the server's failure branch: an unparseable file
    // comes back 200 with zero counts, so it is reported through the same
    // "no data imported" alert as an empty one.
    expect(classifyResponse(response()).kind).toBe('empty');
  });
});
