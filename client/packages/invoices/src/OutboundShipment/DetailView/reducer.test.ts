import { renderHook } from '@testing-library/react-hooks';
import {
  TestingProvider,
  useColumns,
  DocumentAction,
  Invoice,
} from '@openmsupply-client/common';

import { placeholderInvoice } from './index';
import { reducer, OutboundShipmentStateShape, OutboundAction } from './reducer';
import { ItemRow } from './types';

describe('DetailView reducer', () => {
  const lines: ItemRow[] = [
    {
      id: '1',
      quantity: 1,
      stockLineId: '',
      itemName: 'a',
      expiry: '',
      invoiceId: '',
      updateQuantity: () => {},
    },
    {
      id: '3',
      quantity: 3,
      stockLineId: '',
      itemName: 'c',
      expiry: '',
      invoiceId: '',
      updateQuantity: () => {},
    },
    {
      id: '5',
      quantity: 5,
      stockLineId: '',
      itemName: 'b',
      expiry: '',
      invoiceId: '',
      updateQuantity: () => {},
    },
    {
      id: '2',
      quantity: 2,
      stockLineId: '',
      itemName: 'e',
      expiry: '',
      invoiceId: '',
      updateQuantity: () => {},
    },
    {
      id: '4',
      quantity: 4,
      stockLineId: '',
      itemName: 'f',
      expiry: '',
      invoiceId: '',
      updateQuantity: () => {},
    },
    {
      id: '1',
      quantity: 1,
      stockLineId: '',
      itemName: 'd',
      expiry: '',
      invoiceId: '',
      updateQuantity: () => {},
    },
  ];

  it('sorts the lines by the provided key in ascending order when already in descending order for the same key.', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'quantity', isDesc: true, direction: 'desc' },
    };
    const { result } = renderHook(() => useColumns<ItemRow>(['quantity']), {
      wrapper: TestingProvider,
    });

    const quantityColumn = result.current[0];

    if (!quantityColumn) throw new Error('This test is broken!');

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.onSortBy(quantityColumn)
    );

    expect(reducerResult.draft.lines).toEqual([
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '3' }),
      expect.objectContaining({ id: '4' }),
      expect.objectContaining({ id: '5' }),
    ]);
  });

  it('sorts the lines by the provided key in descending order when already in ascending order for the same key.', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'quantity', isDesc: false, direction: 'asc' },
    };
    const { result } = renderHook(() => useColumns<ItemRow>(['quantity']), {
      wrapper: TestingProvider,
    });

    const quantityColumn = result.current[0];

    if (!quantityColumn) throw new Error('This test is broken!');

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.onSortBy(quantityColumn)
    );

    expect(reducerResult.draft.lines).toEqual(
      [
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: '1' }),
        expect.objectContaining({ id: '2' }),
        expect.objectContaining({ id: '3' }),
        expect.objectContaining({ id: '4' }),
        expect.objectContaining({ id: '5' }),
      ].reverse()
    );
  });

  it('sorts the lines by the provided key in ascending order when sorted by some other key.', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'quantity', isDesc: true, direction: 'desc' },
    };
    const { result } = renderHook(() => useColumns<ItemRow>(['itemName']), {
      wrapper: TestingProvider,
    });

    const itemNameColumn = result.current[0];

    if (!itemNameColumn) throw new Error('This test is broken!');

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.onSortBy(itemNameColumn)
    );

    expect(reducerResult.draft.lines).toEqual([
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '5' }),
      expect.objectContaining({ id: '3' }),
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '4' }),
    ]);
  });

  it('updates the correct line with the correct quantity', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'quantity', isDesc: true, direction: 'desc' },
    };

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.updateQuantity('1', 10)
    );

    const line = reducerResult.draft.lines.find(({ id }) => id === '1');

    if (!line) throw new Error('This test is broken!');

    expect(line.quantity).toBe(10);
  });

  it('updates the client side line state by merging the server data into the client data lines, where the server data always wins', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'quantity', isDesc: true, direction: 'desc' },
    };

    // Create some server data which is the same except every line has 99 quantity.
    // Then after merging, every line should have 99 quantity.
    const dataLines = lines.map(line => ({ ...line, quantity: 99 }));
    const data: Invoice = { ...placeholderInvoice, lines: dataLines };

    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a quantity of 99. If there are any, the merge was wrong.
    expect(
      reducerResult.draft.lines.filter(({ quantity }) => quantity !== 99).length
    ).toBe(0);
  });

  it('updates the client side draft state by merging the server invoice into the client data invoice draft, where the server data always wins', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'quantity', isDesc: true, direction: 'desc' },
    };

    // Create a server invoice which has a different comment and merge. The resulting invoice should be the same, except
    // for having the updated comment.
    const data: Invoice = { ...state.draft, comment: 'josh' };
    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a quantity of 99. If there are any, the merge was wrong.

    Object.entries(reducerResult.draft).forEach(([key, value]) => {
      if (key === 'comment') {
        expect(value).toEqual('josh');
      } else {
        expect(JSON.stringify(value)).toEqual(JSON.stringify(state.draft[key]));
      }
    });
  });
});
