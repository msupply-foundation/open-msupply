import {
  DocumentAction,
  Invoice,
  DocumentActionSet,
} from '@openmsupply-client/common';
import { placeholderInvoice } from './index';
import { reducer, OutboundShipmentStateShape, OutboundAction } from './reducer';
import {
  OutboundShipmentRow,
  OutboundShipmentAction,
  OutboundShipmentSummaryItem,
} from './types';

const summaryItems: OutboundShipmentSummaryItem[] = [
  {
    id: '1',
    itemId: '1',
    itemName: '1',
    itemCode: '1',
    itemUnit: '1',
    unitQuantity: 10,
    numberOfPacks: 10,
    packSize: 1,
    batches: {
      '11': {
        id: '11',
        itemId: '1',
        itemName: '1',
        itemCode: '1',
        itemUnit: '1',
        stockLineId: '1',
        unitQuantity: 10,
        numberOfPacks: 10,
        packSize: 1,
        costPricePerPack: 0,
        sellPricePerPack: 0,
        isCreated: false,
        isUpdated: false,
        isDeleted: false,
        invoiceId: '',
      },
      '12': {
        id: '12',
        itemId: '1',
        itemName: '1',
        itemCode: '1',
        itemUnit: '1',
        stockLineId: '2',
        unitQuantity: 10,
        numberOfPacks: 10,
        packSize: 1,
        costPricePerPack: 0,
        sellPricePerPack: 0,
        isCreated: false,
        isUpdated: false,
        isDeleted: false,
        invoiceId: '',
      },
    },
  },
];

const lines: OutboundShipmentRow[] = [
  {
    id: '1',
    updateNumberOfPacks: () => {},
    itemId: '1',
    itemName: 'a',
    itemCode: 'a',
    itemUnit: 'bottle',

    packSize: 1,
    numberOfPacks: 1,
    costPricePerPack: 0,
    sellPricePerPack: 0,

    stockLineId: '1',
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
    stockLineId: '1',
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
    stockLineId: '1',
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
    stockLineId: '1',
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
    stockLineId: '1',
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
    stockLineId: '1',
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
    items: summaryItems,
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

// describe('DetailView reducer: sorting', () => {
//   it('sorts the lines by the provided key in ascending order when already in descending order for the same key.', () => {
//     const state: OutboundShipmentStateShape = getState();

//     const [numberOfPacksColumn] = createColumns<OutboundShipmentSummaryItem>([
//       'numberOfPacks',
//     ]);
//     if (!numberOfPacksColumn) throw new Error('This test is broken!');

//     const reducerResult = reducer(undefined, null)(
//       state,
//       OutboundAction.onSortBy(numberOfPacksColumn)
//     );

//     expect(reducerResult.draft.items).toEqual([
//       expect.objectContaining({ id: '4' }),
//       expect.objectContaining({ id: '3' }),
//       expect.objectContaining({ id: '2' }),
//       expect.objectContaining({ id: '1' }),
//       expect.objectContaining({ id: '0' }),
//     ]);
//   });

//   it('sorts the lines by the provided key in descending order when already in ascending order for the same key.', () => {
//     const state: OutboundShipmentStateShape = getState({ isDesc: false });
//     state.draft.items = getSummaryItems().reverse();

//     const [numberOfPacksColumn] = createColumns<OutboundShipmentSummaryItem>([
//       'numberOfPacks',
//     ]);
//     if (!numberOfPacksColumn) throw new Error('This test is broken!');

//     const reducerResult = reducer(undefined, null)(
//       state,
//       OutboundAction.onSortBy(numberOfPacksColumn)
//     );

//     expect(reducerResult.draft.items).toEqual([
//       expect.objectContaining({ id: '0' }),
//       expect.objectContaining({ id: '1' }),
//       expect.objectContaining({ id: '2' }),
//       expect.objectContaining({ id: '3' }),
//       expect.objectContaining({ id: '4' }),
//     ]);
//   });

//   it('sorts the lines by the provided key in ascending order when sorted by some other key.', () => {
//     const state: OutboundShipmentStateShape = getState();

//     const [itemNameColumn] = createColumns<OutboundShipmentSummaryItem>([
//       'itemName',
//     ]);
//     if (!itemNameColumn) throw new Error('This test is broken!');

//     const reducerResult = reducer(undefined, null)(
//       state,
//       OutboundAction.onSortBy(itemNameColumn)
//     );

//     expect(reducerResult.draft.items).toEqual([
//       expect.objectContaining({ id: '4' }),
//       expect.objectContaining({ id: '3' }),
//       expect.objectContaining({ id: '2' }),
//       expect.objectContaining({ id: '1' }),
//       expect.objectContaining({ id: '0' }),
//     ]);
//   });
// });

const findRow = (
  state: OutboundShipmentStateShape,
  rowId: string,
  otherCondition?: (
    row?: OutboundShipmentRow | OutboundShipmentRow
  ) => OutboundShipmentRow | undefined
): OutboundShipmentRow | undefined => {
  const row = state.draft.items.find(item => {
    return !!item.batches[rowId];
  })?.batches?.[rowId];

  return otherCondition ? otherCondition(row) : row;
};

describe('DetailView reducer: updating lines', () => {
  // it('updates the correct line with the correct numberOfPacks', () => {
  //   const state: OutboundShipmentStateShape = getState();
  //   state.draft.items = getSummaryItems().reverse();

  //   const reducerResult = reducer(undefined, null)(
  //     state,
  //     OutboundAction.updateNumberOfPacks?.('1', 10)
  //   );

  //   const line = reducerResult.draft.lines.find(({ id }) => id === '1');

  //   if (!line) throw new Error('This test is broken!');

  //   expect(line.numberOfPacks).toBe(10);
  // });

  it('updates an existing line when upserting', () => {
    const lineToUpdate = createLine('11', { numberOfPacks: 999 });
    const state = callReducer(OutboundAction.upsertLine(lineToUpdate));

    // Try find the lines we just updated.
    const line = findRow(state, lineToUpdate.id);
    expect(line?.numberOfPacks).toBe(999);
  });

  it('adds flags to an already existing line to be updated, but not created or deleted', () => {
    const lineToUpdate = createLine('11');
    const state = callReducer(OutboundAction.upsertLine(lineToUpdate));

    // Try find the line we just updated
    const line = findRow(state, lineToUpdate.id);

    expect(line).toEqual(
      expect.objectContaining({
        isCreated: false,
        isUpdated: true,
        isDeleted: false,
      })
    );
  });

  it('does not add an update flag to a line which has not been persisted, while keeping the created flag', () => {
    // This test ensures that if we edit a line which has not been persisted, we still keep the created flag.
    // This is important because we want to make sure we know if the line is being created, so we can
    // insert the line rather than update it.

    const lineToUpdate = createLine('999', {
      stockLineId: '999',
      itemId: '999',
    });
    const state1 = callReducer(OutboundAction.upsertLine(lineToUpdate));
    expect(findRow(state1, lineToUpdate?.id)).toBeTruthy();

    const lineToUpdate2 = createLine('999', {
      stockLineId: '999',
      itemId: '999',
      numberOfPacks: 10,
    });
    const state2 = callReducer(
      OutboundAction.upsertLine(lineToUpdate2),
      state1
    );

    // Try find the line we just updated
    const line = findRow(state2, lineToUpdate2.id);

    expect(line).toEqual(
      expect.objectContaining({
        isCreated: true,
        isUpdated: false,
        isDeleted: false,
        numberOfPacks: 10,
      })
    );
  });

  it('adds only an updated flag to an already persisted, but deleted and reused line', () => {
    // The use case: User adds a line. Saves. Deletes the line. Then, adds a line for the same
    // item. We reuse the client-side-deleted line and update it. However, we want to ensure that
    // we only tag the line as an update, NOT as a create as the insert will cause an error.

    // Pseudo-line which is deleted on the client-side but persisted on the server.
    const lineToDelete = createLine('11');
    const state1 = callReducer(OutboundAction.deleteLine(lineToDelete));
    // find the line we just inserted, ensuring it is set up correctly.
    const line1 = findRow(state1, lineToDelete.id);

    expect(line1?.isDeleted).toBeTruthy();

    const lineToUpdate = createLine('02', { stockLineId: '1' });
    const state2 = callReducer(OutboundAction.upsertLine(lineToUpdate));
    const line2 = findRow(state2, lineToDelete.id);

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
      } else if (key === 'lines' || key === 'items') {
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
    const lineToDelete = createLine('11');
    const state = callReducer(OutboundAction.deleteLine(lineToDelete));

    const line = findRow(state, lineToDelete.id);

    expect(line).toEqual(expect.objectContaining({ isDeleted: true }));
  });

  it('a line which is created, then deleted, is removed from state completely', () => {
    const lineToDelete = createLine('99', { itemId: '99', stockLine: '99' });
    const state1 = callReducer(OutboundAction.upsertLine(lineToDelete));
    const state2 = callReducer(OutboundAction.deleteLine(lineToDelete), state1);

    expect(findRow(state1, lineToDelete.id)).toBeTruthy();
    expect(findRow(state2, lineToDelete.id)).toBeFalsy();
  });

  // TODO: Implement this properly when merge is implemented.
  // it('inserting a line for a stock line which has an existing, persisted, but deleted, line, reuses that existing line', () => {
  //   // Mock an already existing and persisted line, which has been deleted client side.
  //   const existingLine = createLine('996', {
  //     itemId: 'item2',
  //     stockLineId: 'item2',
  //     numberOfPacks: 999,
  //   });

  //   const existingLine2 = createLine('998', {
  //     itemId: 'item2',
  //     stockLineId: 'item3',
  //     numberOfPacks: 999,
  //   });

  //   // Simulate the user adding a new line for the same stock line.
  //   const lineToCreate = createLine('993', {
  //     itemId: 'item2',
  //     stockLineId: 'item2',
  //     numberOfPacks: 1,
  //   });
  //   const state1 = callReducer(OutboundAction.upsertLine(existingLine));

  //   const state2 = callReducer(
  //     OutboundAction.upsertLine(existingLine2),
  //     state1
  //   );
  //   const state3 = callReducer(OutboundAction.deleteLine(existingLine), state2);

  //   const state4 = callReducer(OutboundAction.upsertLine(lineToCreate), state3);

  //   expect(findRow(state4, existingLine.id)).toBeTruthy();
  // });
});

describe('DetailView reducer: inserting', () => {
  it('adds flags to a line when inserted for being created', () => {
    const lineToInsert = createLine('999', {
      stockLineId: '999',
      itemId: '999',
    });
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));

    expect(findRow(state, lineToInsert.id)).toEqual(
      expect.objectContaining({
        isCreated: true,
        isUpdated: false,
        isDeleted: false,
      })
    );
  });

  it('inserts an invoice line when it does not exist', () => {
    const lineToInsert = createLine('999', {
      stockLineId: '999',
      itemId: '999',
    });
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));

    expect(findRow(state, lineToInsert.id)).toBeTruthy();
  });
});
