import { describe, expect, it } from 'vitest';
import { batchRefusal } from './inboundShipmentUpdate';

// How a line-selection action reports a batch that didn't go through (spec
// rules → permissions; S7 → action verdicts).
describe('batchRefusal', () => {
  const ids = ['a', 'b'];

  it('is undefined when nothing was refused', () => {
    expect(
      batchRefusal({ applied: true, errors: new Map() }, ids)
    ).toBeUndefined();
  });

  it('sends a Forbidden to the permission-denied modal, not inline', () => {
    expect(
      batchRefusal(
        {
          applied: false,
          errors: new Map(),
          message: 'Missing permission',
          forbidden: ['InboundShipmentExternalAuthorise'],
        },
        ids
      )
    ).toEqual({
      kind: 'forbidden',
      permissions: ['InboundShipmentExternalAuthorise'],
    });
  });

  it('marks every line sent when a batch-level rejection aborted the batch', () => {
    expect(
      batchRefusal(
        { applied: false, errors: new Map(), message: 'Pack size below one' },
        ids
      )
    ).toEqual({
      kind: 'refused',
      message: 'Pack size below one',
      errors: new Map([
        ['a', 'Pack size below one'],
        ['b', 'Pack size below one'],
      ]),
    });
  });

  it('marks only the lines the server named, and shows the first reason', () => {
    const errors = new Map([['b', 'Batch is reserved']]);
    expect(batchRefusal({ applied: false, errors }, ids)).toEqual({
      kind: 'refused',
      message: 'Batch is reserved',
      errors,
    });
  });
});
