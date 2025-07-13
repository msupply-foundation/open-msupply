import { InvoiceNodeStatus } from '@common/types';
import { validateEmptyInvoice } from './StatusChangeButton';

describe('validateEmptyInvoice', () => {
  it('should allow status change for non-New status', () => {
    const lines = { totalCount: 0, nodes: [] };
    expect(validateEmptyInvoice(InvoiceNodeStatus.Shipped, lines)).toBe(true);
  });
  it('should allow status change for New status when has lines', () => {
    const lines = { totalCount: 1, nodes: [{ numberOfPacks: 4 }] };
    expect(validateEmptyInvoice(InvoiceNodeStatus.Shipped, lines)).toBe(true);
  });
  it('should not allow status change for New status with no lines', () => {
    const lines = { totalCount: 0, nodes: [] };
    expect(validateEmptyInvoice(InvoiceNodeStatus.New, lines)).toBe(false);
  });
  it('should not allow status change for New status with lines but no packs', () => {
    const lines = { totalCount: 1, nodes: [{ numberOfPacks: 0 }] };
    expect(validateEmptyInvoice(InvoiceNodeStatus.New, lines)).toBe(false);
  });
});
