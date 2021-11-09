import {
  DocumentAction,
  Invoice,
  createColumns,
} from '@openmsupply-client/common';
import { placeholderInvoice } from './index';
import { reducer, OutboundShipmentStateShape, OutboundAction } from './reducer';
import { OutboundShipmentRow } from './types';

describe('DetailView reducer', () => {
  const lines: OutboundShipmentRow[] = [
    {
      id: '1',
      updateNumberOfPacks: () => {},
      itemId: '1',
      itemUnit: 'bottle',
      itemCode: 'a',
      packSize: 1,
      numberOfPacks: 1,
      costPricePerPack: 0,
      sellPricePerPack: 0,
      itemName: 'a',
    },
    {
      id: '3',
      updateNumberOfPacks: () => {},
      numberOfPacks: 3,
      itemId: '1',
      itemUnit: 'bottle',
      itemCode: 'a',
      packSize: 1,
      costPricePerPack: 0,
      sellPricePerPack: 0,
      itemName: 'c',
    },
    {
      id: '5',
      updateNumberOfPacks: () => {},
      numberOfPacks: 5,
      itemId: '1',
      itemUnit: 'bottle',
      itemCode: 'a',
      packSize: 1,
      costPricePerPack: 0,
      sellPricePerPack: 0,
      itemName: 'b',
    },
    {
      id: '2',
      updateNumberOfPacks: () => {},
      itemId: '1',
      itemUnit: 'bottle',
      itemCode: 'a',
      packSize: 1,
      numberOfPacks: 2,
      costPricePerPack: 0,
      sellPricePerPack: 0,
      itemName: 'e',
    },
    {
      id: '4',
      updateNumberOfPacks: () => {},
      numberOfPacks: 4,
      itemId: '1',
      itemUnit: 'bottle',
      itemCode: 'a',
      packSize: 1,
      costPricePerPack: 0,
      sellPricePerPack: 0,
      itemName: 'f',
    },
    {
      id: '2',
      updateNumberOfPacks: () => {},
      numberOfPacks: 1,
      itemId: '1',
      itemUnit: 'bottle',
      itemCode: 'a',
      packSize: 1,
      costPricePerPack: 0,
      sellPricePerPack: 0,
      itemName: 'd',
    },
  ];

  it('sorts the lines by the provided key in ascending order when already in descending order for the same key.', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'desc' },
      deletedLines: [],
    };

    const [numberOfPacksColumn] = createColumns<OutboundShipmentRow>([
      'numberOfPacks',
    ]);
    if (!numberOfPacksColumn) throw new Error('This test is broken!');

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.onSortBy(numberOfPacksColumn)
    );

    expect(reducerResult.draft.lines).toEqual([
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '3' }),
      expect.objectContaining({ id: '4' }),
      expect.objectContaining({ id: '5' }),
    ]);
  });

  it('sorts the lines by the provided key in descending order when already in ascending order for the same key.', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'numberOfPacks', isDesc: false, direction: 'asc' },
      deletedLines: [],
    };

    const [numberOfPacksColumn] = createColumns<OutboundShipmentRow>([
      'numberOfPacks',
    ]);
    if (!numberOfPacksColumn) throw new Error('This test is broken!');

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.onSortBy(numberOfPacksColumn)
    );

    expect(reducerResult.draft.lines).toEqual(
      [
        expect.objectContaining({ id: '2' }),
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
      sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'desc' },
      deletedLines: [],
    };

    const [itemNameColumn] = createColumns<OutboundShipmentRow>(['itemName']);
    if (!itemNameColumn) throw new Error('This test is broken!');

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.onSortBy(itemNameColumn)
    );

    expect(reducerResult.draft.lines).toEqual([
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '5' }),
      expect.objectContaining({ id: '3' }),
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '4' }),
    ]);
  });

  it('updates the correct line with the correct numberOfPacks', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'desc' },
      deletedLines: [],
    };

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.updateNumberOfPacks?.('1', 10)
    );

    const line = reducerResult.draft.lines.find(({ id }) => id === '1');

    if (!line) throw new Error('This test is broken!');

    expect(line.numberOfPacks).toBe(10);
  });

  it('updates the client side line state by merging the server data into the client data lines, where the server data always wins', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'numberofpacks', isDesc: true, direction: 'desc' },
      deletedLines: [],
    };

    // Create some server data which is the same except every line has 99 numberOfPacks.
    // Then after merging, every line should have 99 numberOfPacks.
    const dataLines = lines.map(line => ({ ...line, numberOfPacks: 99 }));
    const data: Invoice = { ...placeholderInvoice, lines: dataLines };

    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a numberOfPacks of 99. If there are any, the merge was wrong.
    expect(
      reducerResult.draft.lines.filter(
        ({ numberOfPacks }) => numberOfPacks !== 99
      ).length
    ).toBe(0);
  });

  it('updates the client side draft state by merging the server invoice into the client data invoice draft, where the server data always wins', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'desc' },
      deletedLines: [],
    };

    // Create a server invoice which has a different comment and merge. The resulting invoice should be the same, except
    // for having the updated comment.
    const data: Invoice = { ...state.draft, comment: 'josh' };
    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a numberOfPacks of 99. If there are any, the merge was wrong.

    Object.entries(reducerResult.draft).forEach(([key, value]) => {
      if (key === 'comment') {
        expect(value).toEqual('josh');
      } else {
        expect(JSON.stringify(value)).toEqual(JSON.stringify(state.draft[key]));
      }
    });
  });

  it('transfers deleted lines from the draft to the deleted lines cache', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'desc' },
      deletedLines: [],
    };

    const lineToDelete = lines[0] as OutboundShipmentRow;
    const reducerResult = reducer({ ...state.draft }, null)(
      state,
      OutboundAction.deleteLine(lineToDelete)
    );

    // Try find the lines we just deleted
    const line = reducerResult.draft.lines.find(
      ({ id }) => lineToDelete.id === id
    );

    expect(line).toBeFalsy();
    expect(reducerResult.deletedLines[0]).toEqual(lines[0]);
  });

  // it('updates an existing line when upserting', () => {
  //   const state: OutboundShipmentStateShape = {
  //     draft: { ...placeholderInvoice, lines },
  //     sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'desc' },
  //     deletedLines: [],
  //   };

  //   const lineToDelete = { ...lines[0], numberOfPacks: 999 } as OutboundShipmentRow;
  //   const reducerResult = reducer({ ...state.draft }, null)(
  //     state,
  //     OutboundAction.upsertLine(lineToDelete)
  //   );

  //   // Try find the lines we just deleted
  //   const line = reducerResult.draft.lines.find(
  //     ({ id }) => lineToDelete.id === id
  //   );

  //   expect(line?.numberOfPacks).toBe(999);
  // });

  it('inserts an invoice line when it does not exist', () => {
    const state: OutboundShipmentStateShape = {
      draft: { ...placeholderInvoice, lines },
      sortBy: { key: 'numberOfPacks', isDesc: true, direction: 'desc' },
      deletedLines: [],
    };

    const lineToInsert = { ...lines[0], id: '999' } as OutboundShipmentRow;
    const reducerResult = reducer({ ...state.draft }, null)(
      state,
      OutboundAction.upsertLine(lineToInsert)
    );

    // Try find the lines we just deleted
    const line = reducerResult.draft.lines.find(
      ({ id }) => lineToInsert.id === id
    );

    expect(line).toBeTruthy();
  });
});
