import { describe, expect, it } from 'vitest';
import {
  configurationWrite,
  loadConfiguration,
  pickConfigurationRecord,
} from './configuration';

// spec/plugin-management/acceptance.md › configuring

const DEFAULT = { greeting: 'Hello' };
const STORE = 'store-a';

describe('AC-C4 — nothing stored: the editor starts from the default', () => {
  it('seeds the default and has no record to update', () => {
    expect(loadConfiguration(undefined, DEFAULT)).toEqual({
      recordId: undefined,
      value: DEFAULT,
    });
  });
});

describe('AC-C5 — the first save creates one installation-wide record', () => {
  it('inserts the whole value under the reserved identifier, with no store', () => {
    const write = configurationWrite(STORE, 'hello_world', undefined, {
      greeting: 'Kia ora',
    });
    expect(write.kind).toBe('insert');
    if (write.kind !== 'insert') return;
    expect(write.variables.storeId).toBe(STORE);
    expect(write.variables.input).toMatchObject({
      pluginCode: 'hello_world',
      dataIdentifier: 'configuration',
      data: '{"greeting":"Kia ora"}',
    });
    // Leaving input.storeId out is what makes the record store-less.
    expect('storeId' in write.variables.input).toBe(false);
    expect(write.variables.input.id).toMatch(/[0-9a-f-]{36}/);
  });
});

describe('AC-C6 — a stored configuration opens, and a save updates that record', () => {
  it('seeds the stored value', () => {
    const record = { id: 'cfg-1', storeId: null, data: '{"greeting":"Hi"}' };
    expect(loadConfiguration(record, DEFAULT)).toEqual({
      recordId: 'cfg-1',
      value: { greeting: 'Hi' },
    });
  });

  it('updates the same record id rather than adding a second', () => {
    const write = configurationWrite(STORE, 'hello_world', 'cfg-1', {
      greeting: 'Hey',
    });
    expect(write.kind).toBe('update');
    expect(write.variables.input.id).toBe('cfg-1');
    expect(write.variables.input.data).toBe('{"greeting":"Hey"}');
  });
});

describe('AC-C7 — an unreadable stored value opens on the default', () => {
  it('seeds the default but keeps the record, so a save replaces it', () => {
    const record = { id: 'cfg-bad', storeId: null, data: '{not json' };
    expect(loadConfiguration(record, DEFAULT)).toEqual({
      recordId: 'cfg-bad',
      value: DEFAULT,
    });
  });
});

describe('AC-C10 — the installation-wide record wins over a store-scoped one', () => {
  it('picks the store-less record', () => {
    const answer = {
      nodes: [
        { id: 'store-scoped', storeId: STORE, data: '{"greeting":"store"}' },
        { id: 'global', storeId: null, data: '{"greeting":"global"}' },
      ],
    };
    expect(pickConfigurationRecord(answer)?.id).toBe('global');
  });

  it('answers none when only a store-scoped record exists', () => {
    const answer = {
      nodes: [{ id: 'store-scoped', storeId: STORE, data: '{}' }],
    };
    expect(pickConfigurationRecord(answer)).toBeUndefined();
  });
});
