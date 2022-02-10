import { renderHook } from '@testing-library/react-hooks';
import { createDraftOutboundLine } from './useDraftOutboundLines';
import { DraftOutboundLine } from 'packages/invoices/src/types';
import { usePackSizeController } from './usePackSizeController';
import { act } from '@testing-library/react';

const singlePackSizeLines: DraftOutboundLine[] = [
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 1,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
    },
    invoiceLine: { numberOfPacks: 1 },
  }),
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 1,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
    },
    invoiceLine: { numberOfPacks: 1 },
  }),
];

const multiplePackSizeLines: DraftOutboundLine[] = [
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 1,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
    },
    invoiceLine: { numberOfPacks: 1 },
  }),
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 2,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
    },
    invoiceLine: { numberOfPacks: 1 },
  }),
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 3,
      totalNumberOfPacks: 0,
      availableNumberOfPacks: 0,
    },
    invoiceLine: { numberOfPacks: 0 },
  }),
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 4,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
      onHold: true,
    },
    invoiceLine: { numberOfPacks: 1 },
  }),
];

const multipleWithOneAssigned: DraftOutboundLine[] = [
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 1,
      totalNumberOfPacks: 1,
      availableNumberOfPacks: 1,
    },
    invoiceLine: { numberOfPacks: 1 },
  }),
  createDraftOutboundLine({
    invoiceId: '',
    stockLine: {
      packSize: 2,
      totalNumberOfPacks: 0,
      availableNumberOfPacks: 0,
    },
    invoiceLine: { numberOfPacks: 0 },
  }),
];

describe('usePackSizeController', () => {
  it('returns the correct distinct pack sizes of available batches', () => {
    const { result } = renderHook(() =>
      usePackSizeController(multiplePackSizeLines)
    );
    expect(result.current.packSizes).toEqual([1, 2]);
  });

  it('returns the correct pack sizes options including an option for "any"', () => {
    const { result } = renderHook(() =>
      usePackSizeController(multiplePackSizeLines)
    );
    expect(result.current.options).toEqual([
      { label: 'label.any', value: -1 },
      { label: '1', value: 1 },
      { label: '2', value: 2 },
    ]);
  });

  it('selects the correct pack size', () => {
    const { result } = renderHook(() =>
      usePackSizeController(multiplePackSizeLines)
    );

    act(() => {
      result.current.setPackSize(2);
    });

    expect(result.current.selected).toEqual({ label: '2', value: 2 });
  });

  it('has an initial selected state of "any" when there are multiple different pack sizes available', () => {
    const { result } = renderHook(() =>
      usePackSizeController(multiplePackSizeLines)
    );

    expect(result.current.selected).toEqual({ label: 'label.any', value: -1 });
  });

  it('ignores setting of pack sizes which are invalid', () => {
    const { result } = renderHook(() =>
      usePackSizeController(multiplePackSizeLines)
    );

    act(() => {
      result.current.setPackSize(10);
    });

    expect(result.current.selected).toEqual({ label: 'label.any', value: -1 });
  });

  it('sets the pack size to any when selected', async () => {
    const { result } = renderHook(() =>
      usePackSizeController(multiplePackSizeLines)
    );

    act(() => {
      result.current.setPackSize(1);
    });

    expect(result.current.selected).toEqual({
      label: '1',
      value: 1,
    });

    act(() => {
      result.current.setPackSize(-1);
    });

    expect(result.current.selected).toEqual({
      label: 'label.any',
      value: -1,
    });
  });

  it('sets the initial pack size of a set of lines which all have the same pack size, to the only available pack size', () => {
    const { result } = renderHook(() =>
      usePackSizeController(singlePackSizeLines)
    );

    expect(result.current.selected).toEqual({
      label: '1',
      value: 1,
    });
  });

  it('has an initial value of undefined when the array is empty', () => {
    const { result } = renderHook(() => usePackSizeController([]));

    expect(result.current.selected).toEqual(undefined);
  });

  it('has an initial value of the unique pack size with assigned packs, not any', () => {
    const { result } = renderHook(() =>
      usePackSizeController(multipleWithOneAssigned)
    );

    expect(result.current.selected).toEqual({ label: '1', value: 1 });
  });
});
