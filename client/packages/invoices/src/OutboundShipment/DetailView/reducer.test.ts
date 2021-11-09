import {
  DocumentAction,
  Invoice,
  createColumns,
  DocumentActionSet,
} from '@openmsupply-client/common';
import { placeholderInvoice } from './index';
import { reducer, OutboundShipmentStateShape, OutboundAction } from './reducer';
import { OutboundShipmentRow, OutboundShipmentAction } from './types';

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
      stockLineId: '',
      invoiceId: '',
      isCreated: false,
      isUpdated: false,
      isDeleted: false,
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
      stockLineId: '',
      invoiceId: '',
      isCreated: false,
      isUpdated: false,
      isDeleted: false,
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
      stockLineId: '',
      invoiceId: '',
      isCreated: false,
      isUpdated: false,
      isDeleted: false,
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
      stockLineId: '',
      invoiceId: '',
      isCreated: false,
      isUpdated: false,
      isDeleted: false,
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
      stockLineId: '',
      invoiceId: '',
      isCreated: false,
      isUpdated: false,
      isDeleted: false,
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
      stockLineId: '',
      invoiceId: '',
      isCreated: false,
      isUpdated: false,
      isDeleted: false,
    },
  ];

  const getState = ({ isDesc = true } = {}): OutboundShipmentStateShape => ({
    draft: { ...placeholderInvoice, lines },
    sortBy: {
      key: 'numberOfPacks',
      isDesc: isDesc,
      direction: isDesc ? 'desc' : 'asc',
    },
    deletedLines: [],
  });

  const createLine = (
    id: string,
    values: Partial<OutboundShipmentRow> = {}
  ): OutboundShipmentRow => {
    return { ...(lines[0] as OutboundShipmentRow), id, ...values };
  };

  const callReducer = (
    action: DocumentActionSet<OutboundShipmentAction>,
    state = getState()
  ) => {
    return reducer(state.draft, null)(state, action);
  };

  it('sorts the lines by the provided key in ascending order when already in descending order for the same key.', () => {
    const state: OutboundShipmentStateShape = getState();

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
    const state: OutboundShipmentStateShape = getState({ isDesc: false });

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
    const state: OutboundShipmentStateShape = getState();

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
    const state: OutboundShipmentStateShape = getState();

    const reducerResult = reducer(undefined, null)(
      state,
      OutboundAction.updateNumberOfPacks?.('1', 10)
    );

    const line = reducerResult.draft.lines.find(({ id }) => id === '1');

    if (!line) throw new Error('This test is broken!');

    expect(line.numberOfPacks).toBe(10);
  });

  it('updates the client side line state by merging the server data into the client data lines, where the server data always wins', () => {
    const state: OutboundShipmentStateShape = getState();

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
    const state: OutboundShipmentStateShape = getState();

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
    const lineToDelete = createLine('1');
    const state = callReducer(OutboundAction.deleteLine(lineToDelete));

    const line = state.draft.lines.find(({ id }) => lineToDelete.id === id);

    expect(line).toBeFalsy();
    expect(state.deletedLines[0]).toEqual(lines[0]);
  });

  it('updates an existing line when upserting', () => {
    const lineToUpdate = createLine('1', { numberOfPacks: 999 });
    const state = callReducer(OutboundAction.upsertLine(lineToUpdate));

    // Try find the lines we just deleted
    const line = state.draft.lines.find(({ id }) => lineToUpdate.id === id);
    expect(line?.numberOfPacks).toBe(999);
  });

  it('adds flags to a line when inserted for being created', () => {
    const lineToInsert = createLine('999');
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));

    // Try find the lines we just deleted
    const line = state.draft.lines.find(({ id }) => lineToInsert.id === id);

    expect(line).toEqual(
      expect.objectContaining({
        isCreated: true,
        isUpdated: true,
        isDeleted: false,
      })
    );
  });

  it('adds flags to an already existing line to be updated, but not created or deleted', () => {
    const lineToUpdate = createLine('1');
    const state = callReducer(OutboundAction.upsertLine(lineToUpdate));

    // Try find the line we just updated
    const line = state.draft.lines.find(({ id }) => lineToUpdate.id === id);

    expect(line).toEqual(
      expect.objectContaining({
        isCreated: false,
        isUpdated: true,
        isDeleted: false,
      })
    );
  });

  it('adds an update flag to a line which has not been persisted, while keeping the created flag', () => {
    // This test ensures that if we edit a line which has not been persisted, we still keep the created flag.
    // This is important because we want to make sure we know if the line is being created, so we can
    // insert the line rather than update it.

    const lineToUpdate = createLine('999', { isCreated: true });
    const state = callReducer(OutboundAction.upsertLine(lineToUpdate));

    // Try find the line we just updated
    const line = state.draft.lines.find(({ id }) => lineToUpdate.id === id);

    expect(line).toEqual(
      expect.objectContaining({
        isCreated: true,
        isUpdated: true,
        isDeleted: false,
      })
    );
  });

  it('inserts an invoice line when it does not exist', () => {
    const lineToInsert = createLine('999');
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));
    // Try find the line we just added in state
    const line = state.draft.lines.find(({ id }) => lineToInsert.id === id);
    expect(line).toBeTruthy();
  });
});
