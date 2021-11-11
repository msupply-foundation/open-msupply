import {
  DocumentAction,
  Invoice,
  createColumns,
  DocumentActionSet,
} from '@openmsupply-client/common';
import { placeholderInvoice } from './index';
import { reducer, OutboundShipmentStateShape, OutboundAction } from './reducer';
import { OutboundShipmentRow, OutboundShipmentAction } from './types';

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

const getState = ({
  isDesc = true,
  defaultLines = [] as OutboundShipmentRow[],
} = {}): OutboundShipmentStateShape => ({
  draft: {
    ...placeholderInvoice,
    lines: defaultLines.length ? defaultLines : lines,
  },
  sortBy: {
    key: 'numberOfPacks',
    isDesc: isDesc,
    direction: isDesc ? 'desc' : 'asc',
  },
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

describe('DetailView reducer: sorting', () => {
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
});

describe('DetailView reducer: updating lines', () => {
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

  it('updates an existing line when upserting', () => {
    const lineToUpdate = createLine('1', { numberOfPacks: 999 });
    const state = callReducer(OutboundAction.upsertLine(lineToUpdate));

    // Try find the lines we just deleted
    const line = state.draft.lines.find(({ id }) => lineToUpdate.id === id);
    expect(line?.numberOfPacks).toBe(999);
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

  it('adds only an updated flag to an already persisted, but deleted and reused line', () => {
    // The use case: User adds a line. Saves. Deletes the line. Then, adds a line for the same
    // item. We reuse the client-side-deleted line and update it. However, we want to ensure that
    // we only tag the line as an update, NOT as a create as the insert will cause an error.

    // Pseudo-line which is deleted on the client-side but persisted on the server.
    const lineToDelete = createLine('1', {
      itemId: '1',
      isDeleted: true,
      isCreated: false,
      isUpdated: false,
    });
    const state1 = callReducer(OutboundAction.upsertLine(lineToDelete));
    // find the line we just inserted, ensuring it is set up correctly.
    const line1 = state1.draft.lines.find(
      ({ id, isUpdated, isDeleted, isCreated }) =>
        lineToDelete.id === id && isUpdated && !isDeleted && !isCreated
    );
    expect(line1).toBeTruthy();

    const lineToUpdate = createLine('2', { itemId: '1' });
    const state2 = callReducer(OutboundAction.upsertLine(lineToUpdate));
    const line2 = state2.draft.lines.find(({ id }) => lineToUpdate.id === id);

    expect(line2).toEqual(
      expect.objectContaining({
        isCreated: false,
        isUpdated: true,
        isDeleted: false,
      })
    );
  });
});

describe('DetailView reducer: merging', () => {
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

  it('sets the correct flags for each line when merging new server state', () => {
    // The shipment has three lines. Two of them are new and one is updated.
    // When the server state is merged, the created lines should have the isCreated flag set to false
    // to indicate they have been persisted.
    const defaultLines = [
      createLine('1', { isCreated: true }),
      createLine('2', { isCreated: false }),
      createLine('3', { isCreated: true }),
    ];

    const state: OutboundShipmentStateShape = getState({ defaultLines });

    const dataLines = [...defaultLines];
    const data: Invoice = { ...placeholderInvoice, lines: dataLines };

    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a numberOfPacks of 99. If there are any, the merge was wrong.
    expect(
      reducerResult.draft.lines.every(
        ({ isCreated, isDeleted, isUpdated }) =>
          !isCreated && !isDeleted && isUpdated
      )
    ).toBe(true);
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
      } else if (key === 'lines') {
        // Lines to be handled in their own tests as they're more complex.
        return;
      } else {
        expect(JSON.stringify(value)).toEqual(JSON.stringify(state.draft[key]));
      }
    });
  });
});

describe('DetailView reducer: deleting lines', () => {
  it('deleted lines are tagged as such', () => {
    const lineToDelete = createLine('1');
    const state = callReducer(OutboundAction.deleteLine(lineToDelete));

    const line = state.draft.lines.find(({ id }) => lineToDelete.id === id);

    expect(line).toEqual(expect.objectContaining({ isDeleted: true }));
  });

  it('a line which is created, then deleted, is removed from state completely', () => {
    const lineToDelete = createLine('99');
    const state1 = callReducer(OutboundAction.upsertLine(lineToDelete));
    const state2 = callReducer(OutboundAction.deleteLine(lineToDelete), state1);

    // Find the line in the first state, ensuring we did create it
    const lineCreated = state1.draft.lines.find(
      ({ id }) => lineToDelete.id === id
    );
    // Should not find the line in the second state
    const lineDeleted = state2.draft.lines.find(
      ({ id }) => lineToDelete.id === id
    );

    expect(lineCreated).toBeTruthy();
    expect(lineDeleted).toBeFalsy();
  });

  it('inserting a line for an item which has an existing, persisted, but deleted, line, reuses that existing line', () => {
    // Mock an already existing and persisted line, which has been deleted client side.
    const existingLine = createLine('999', {
      itemId: 'item1',
      numberOfPacks: 999,
      isCreated: false,
      isDeleted: true,
    });

    // Simulate the user adding a new line for the same item.
    const lineToCreate2 = createLine('998', {
      itemId: 'item1',
      numberOfPacks: 999,
    });
    const state = callReducer(
      OutboundAction.upsertLine(lineToCreate2),
      // Note the use of the existing line in state.
      getState({ defaultLines: [existingLine] })
    );
    const lineCreated2 = state.draft.lines.find(
      // The line should exist in the draft with the same ID and have the isDeleted tag set to false AND the isCreated tag.
      // Note that we are matching on the original line id, not the new line id.
      ({ id }) => existingLine?.id === id
    );

    expect(lineCreated2).toBeTruthy();
  });
});

describe('DetailView reducer: inserting', () => {
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

  it('inserts an invoice line when it does not exist', () => {
    const lineToInsert = createLine('999');
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));
    // Try find the line we just added in state
    const line = state.draft.lines.find(({ id }) => lineToInsert.id === id);
    expect(line).toBeTruthy();
  });
});
