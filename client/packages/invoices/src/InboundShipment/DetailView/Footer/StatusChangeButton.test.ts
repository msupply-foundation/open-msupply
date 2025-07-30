import { validateEmptyInvoice } from './StatusChangeButton';
import { InboundLineFragment } from '../../api';
import { InvoiceLineNodeType } from '@common/types';

describe('validateEmptyInvoice', () => {
  it('should not allow status change when no lines', () => {
    const lines = { totalCount: 0, nodes: [] };
    expect(validateEmptyInvoice(lines)).toBe(false);
  });

  it('should not allow status change when lines have no packs', () => {
    const lines = {
      totalCount: 1,
      nodes: [makeLine({ numberOfPacks: 0 })],
    };
    expect(validateEmptyInvoice(lines)).toBe(false);
  });
  it('should allow status change when has lines with received packs', () => {
    const lines = {
      totalCount: 1,
      nodes: [makeLine({ numberOfPacks: 4 })],
    };
    expect(validateEmptyInvoice(lines)).toBe(true);
  });
  it('should allow status change when has lines with shipped packs', () => {
    const lines = {
      totalCount: 1,
      nodes: [makeLine({ numberOfPacks: 0, shippedNumberOfPacks: 3 })],
    };
    expect(validateEmptyInvoice(lines)).toBe(true);
  });
});

const makeLine = ({
  numberOfPacks,
  shippedNumberOfPacks,
}: {
  numberOfPacks: number;
  shippedNumberOfPacks?: number;
}) =>
  ({
    type: InvoiceLineNodeType.StockIn,
    numberOfPacks,
    shippedNumberOfPacks,
  }) as InboundLineFragment;
