import { usePackSizeController } from './usePackSizeController';
import { act } from '@testing-library/react';
import {
  InvoiceLineNodeType,
  renderHookWithProvider,
} from '@openmsupply-client/common';
import {
  createDraftStockOutLine,
  createStockOutPlaceholderRow,
} from '../utils';
import { DraftStockOutLine } from '../../types';

const pastDate = () => new Date(0).toISOString();

type TestLineParams = {
  id: string;
  itemId?: string;
  packSize?: number;
  totalNumberOfPacks?: number;
  availableNumberOfPacks?: number;
  numberOfPacks: number;
  onHold?: boolean;
  expiryDate?: string;
};

const makePlaceholder = () => createStockOutPlaceholderRow('1', '1');

const testLine = ({
  itemId = '1',
  packSize = 1,
  totalNumberOfPacks = 1,
  availableNumberOfPacks = 1,
  numberOfPacks,
  id,
  onHold = false,
  expiryDate = undefined,
}: TestLineParams): DraftStockOutLine =>
  createDraftStockOutLine({
    invoiceId: '',
    invoiceLine: {
      id,
      expiryDate,
      sellPricePerPack: 0,
      totalBeforeTax: 0,
      totalAfterTax: 0,
      item: {
        id: itemId,
        code: '',
        name: '',
        unitName: '',
        __typename: 'ItemNode',
      },
      itemName: '',
      type: InvoiceLineNodeType.StockOut,
      packSize,
      invoiceId: '',
      __typename: 'InvoiceLineNode',
      numberOfPacks,
      stockLine: {
        __typename: 'StockLineNode',
        id: 'a',
        totalNumberOfPacks,
        availableNumberOfPacks,
        onHold,
        sellPricePerPack: 0,
        itemId,
        packSize,
        item: {
          code: '',
          name: '',
          __typename: 'ItemNode',
        },
      },
    },
  });

const singlePackSizeLines: DraftStockOutLine[] = [
  testLine({ id: '1', numberOfPacks: 1 }),
  testLine({ id: '2', numberOfPacks: 1 }),
  makePlaceholder(),
];

const multiplePackSizeLines: DraftStockOutLine[] = [
  testLine({ id: '1', numberOfPacks: 1 }),
  testLine({ id: '2', numberOfPacks: 1, packSize: 2 }),
  testLine({
    id: '3',
    numberOfPacks: 0,
    packSize: 3,
    totalNumberOfPacks: 0,
    availableNumberOfPacks: 0,
  }),
  testLine({ id: '4', packSize: 4, numberOfPacks: 1, onHold: true }),
  makePlaceholder(),
];

const multipleWithOneAssigned: DraftStockOutLine[] = [
  testLine({
    id: '1',
    packSize: 1,
    numberOfPacks: 1,
  }),
  testLine({
    id: '2',
    packSize: 2,
    totalNumberOfPacks: 0,
    availableNumberOfPacks: 0,
    numberOfPacks: 0,
    itemId: '3',
  }),
  makePlaceholder(),
];

const singleLineWithNoneAssigned: DraftStockOutLine[] = [
  testLine({
    id: '1',
    packSize: 2,
    totalNumberOfPacks: 10,
    availableNumberOfPacks: 10,
    numberOfPacks: 0,
  }),
  makePlaceholder(),
];

const multipleLinesWithNoneAssigned: DraftStockOutLine[] = [
  testLine({
    id: '1',
    packSize: 2,
    totalNumberOfPacks: 10,
    availableNumberOfPacks: 10,
    numberOfPacks: 0,
  }),
  testLine({
    id: '1',
    packSize: 2,
    totalNumberOfPacks: 10,
    availableNumberOfPacks: 10,
    numberOfPacks: 0,
  }),
  makePlaceholder(),
];

const multipleLinesWithNoneAssignedMultiplePackSizes: DraftStockOutLine[] = [
  testLine({
    id: '1',
    packSize: 1,
    totalNumberOfPacks: 10,
    availableNumberOfPacks: 10,
    numberOfPacks: 0,
  }),

  testLine({
    id: '1',
    packSize: 2,
    totalNumberOfPacks: 10,
    availableNumberOfPacks: 10,
    numberOfPacks: 0,
  }),
  makePlaceholder(),
];

describe('usePackSizeController', () => {
  it('gives an option for all pack sizes when there are multiple.', () => {
    const lines = [
      testLine({ id: '1', numberOfPacks: 1 }),
      testLine({ id: '2', numberOfPacks: 1, packSize: 2 }),
      testLine({ id: '3', numberOfPacks: 1, packSize: 3 }),
    ];
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, lines)
    );

    expect(result.current.options.map(({ value }) => value)).toEqual([
      -1, 1, 2, 3,
    ]);
  });

  it('returns the correct pack sizes options including an option for "any"', () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multiplePackSizeLines)
    );

    expect(result.current.options).toEqual([
      { label: 'label.any', value: -1 },
      { label: '1', value: 1 },
      { label: '2', value: 2 },
    ]);
  });

  it('selects the correct pack size', () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multiplePackSizeLines)
    );

    act(() => {
      result.current.setPackSize(2);
    });

    expect(result.current.selected).toEqual({ label: '2', value: 2 });
  });

  it('has an initial selected state of "any" when there are multiple different pack sizes available', () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multiplePackSizeLines)
    );

    expect(result.current.selected).toEqual({ label: 'label.any', value: -1 });
  });

  it('ignores setting of pack sizes which are invalid', () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multiplePackSizeLines)
    );

    act(() => {
      result.current.setPackSize(10);
    });

    expect(result.current.selected).toEqual({ label: 'label.any', value: -1 });
  });

  it('sets the pack size to any when selected', async () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multiplePackSizeLines)
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
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, singlePackSizeLines)
    );

    expect(result.current.selected).toEqual({
      label: '1',
      value: 1,
    });
  });

  it('has an initial value of any when the array is empty', () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, [makePlaceholder()])
    );

    expect(result.current.selected).toEqual({ label: '1', value: 1 });
  });

  it('has an initial value of the unique pack size with assigned packs, not any', () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multipleWithOneAssigned)
    );

    expect(result.current.selected).toEqual({ label: '1', value: 1 });
  });

  it('has an initial value of the unique pack size with assigned packs, not any', () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multipleWithOneAssigned)
    );

    expect(result.current.selected).toEqual({ label: '1', value: 1 });
  });

  it('has an initial value of Any when only the placeholder row has assigned packs', () => {
    const placeholder = makePlaceholder();
    placeholder.numberOfPacks = 10;
    const arr = [...singleLineWithNoneAssigned, placeholder];
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, arr)
    );

    expect(result.current.selected).toEqual({ label: 'label.any', value: -1 });
  });

  it('has an initial value of the unique pack size with no assigned packs', async () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, singleLineWithNoneAssigned)
    );

    expect(result.current.selected).toEqual({ label: '2', value: 2 });
  });

  it('has an initial value of the unique pack size with no assigned packs', async () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, multipleLinesWithNoneAssigned)
    );

    expect(result.current.selected).toEqual({ label: '2', value: 2 });
  });

  it('has an initial value of the unique pack size with no assigned packs', async () => {
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(
        null,
        multipleLinesWithNoneAssignedMultiplePackSizes
      )
    );

    expect(result.current.selected).toEqual({ label: 'label.any', value: -1 });
  });

  it('expired lines are not added to the pack size options, any is instead.', async () => {
    const lines = [
      testLine({ id: '1', numberOfPacks: 1, expiryDate: pastDate() }),
      testLine({
        id: '1',
        packSize: 2,
        numberOfPacks: 1,
      }),
      makePlaceholder(),
    ];
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, lines)
    );

    expect(result.current.options.map(({ value }) => value)).toEqual([-1, 2]);
  });

  it('still does not add expired packs into the pack size options when there is allocated stock to the expired line.', async () => {
    const lines = [
      testLine({ id: '1', numberOfPacks: 1, expiryDate: pastDate() }),
      testLine({
        id: '1',
        packSize: 2,
        numberOfPacks: 1,
      }),
      makePlaceholder(),
    ];
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, lines)
    );

    expect(result.current.options.map(({ value }) => value)).toEqual([-1, 2]);
  });

  it('does not use the placeholder pack size when there is only the placeholder and one other line.', async () => {
    const lines = [
      testLine({
        id: '1',
        packSize: 2,
        numberOfPacks: 1,
      }),
      makePlaceholder(),
    ];
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, lines)
    );

    expect(result.current.options.map(({ value }) => value)).toEqual([2]);
  });

  it('has an any option when there is an expired line.', async () => {
    const lines = [
      testLine({ id: '1', numberOfPacks: 1, expiryDate: pastDate() }),
    ];
    const { result } = renderHookWithProvider(() =>
      usePackSizeController(null, lines)
    );

    expect(result.current.options.map(({ value }) => value)).toEqual([-1]);
  });
});
