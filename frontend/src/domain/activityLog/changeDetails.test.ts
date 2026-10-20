import { describe, expect, it } from 'vitest';
import { describeChange } from './changeDetails';

describe('describeChange', () => {
  it('falls back to the scalar form when neither side is a JSON object', () => {
    expect(describeChange('10', '8')).toBeNull();
    expect(describeChange(null, null)).toBeNull();
    expect(describeChange('[1]', '[2]')).toBeNull();
  });

  it('falls back when every value is empty', () => {
    expect(describeChange('{"status":null}', null)).toBeNull();
    expect(describeChange(null, '{"status":null}')).toBeNull();
  });

  it('lists every value of a creation', () => {
    expect(
      describeChange(
        null,
        '{"pack-size":3,"item-code":"PARA500","requested-units":10.0}'
      )
    ).toEqual([
      { key: 'pack-size', kind: 'value', value: 3 },
      { key: 'item-code', kind: 'value', value: 'PARA500' },
      { key: 'requested-units', kind: 'value', value: 10 },
    ]);
  });

  it('names the line, then each changed field with its old and new value', () => {
    expect(
      describeChange(
        '{"adjusted-units":10.0,"expected-delivery-date":"2026-09-30"}',
        '{"pack-size":3,"item-code":"PARA500","item-name":"Paracetamol","adjusted-units":8.0,"expected-delivery-date":"2026-10-14"}'
      )
    ).toEqual([
      { key: 'pack-size', kind: 'value', value: 3 },
      { key: 'item-code', kind: 'value', value: 'PARA500' },
      { key: 'item-name', kind: 'value', value: 'Paracetamol' },
      {
        key: 'adjusted-units',
        kind: 'changed',
        before: 10,
        after: 8,
      },
      {
        key: 'expected-delivery-date',
        kind: 'changed',
        before: '2026-09-30',
        after: '2026-10-14',
      },
    ]);
  });

  it('reads a cleared field as removed', () => {
    expect(
      describeChange(
        '{"expected-delivery-date":"2026-09-30"}',
        '{"pack-size":3}'
      )
    ).toEqual([
      { key: 'pack-size', kind: 'value', value: 3 },
      {
        key: 'expected-delivery-date',
        kind: 'removed',
        before: '2026-09-30',
      },
    ]);
  });

  it('lists a deletion snapshot as plain values', () => {
    expect(
      describeChange('{"pack-size":3,"item-code":"PARA500"}', null)
    ).toEqual([
      { key: 'pack-size', kind: 'value', value: 3 },
      { key: 'item-code', kind: 'value', value: 'PARA500' },
    ]);
  });
});
