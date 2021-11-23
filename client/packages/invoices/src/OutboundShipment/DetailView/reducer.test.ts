import { InboundAction } from './../../InboundShipment/DetailView/reducer/reducer';
import { InboundShipmentItem } from './../../types';
import {
  Column,
  createColumns,
  DocumentActionSet,
  DocumentAction,
} from '@openmsupply-client/common';
import { placeholderInvoice, flattenOutboundItems } from '../../utils';
import { reducer, OutboundShipmentStateShape, OutboundAction } from './reducer';
import {
  OutboundShipment,
  OutboundShipmentRow,
  OutboundShipmentAction,
  OutboundShipmentSummaryItem,
} from '../../types';

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
        stockLineId: '1',
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
        stockLineId: '2',
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

const getState = ({ isDesc = true } = {}): OutboundShipmentStateShape => ({
  draft: {
    ...placeholderInvoice,
    lines: [],
    items: [...summaryItems],
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
  return {
    itemId: '1',
    itemName: '1',
    itemCode: '1',
    stockLineId: '1',
    numberOfPacks: 10,
    packSize: 1,
    costPricePerPack: 0,
    sellPricePerPack: 0,
    isCreated: false,
    isUpdated: false,
    isDeleted: false,
    invoiceId: '',
    id,
    ...values,
  };
};

const callReducer = (
  action: DocumentActionSet<OutboundShipmentAction>,
  state = getState(),
  data?: OutboundShipment
) => {
  return reducer(data ?? state.draft, null)(state, action);
};

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

describe('DetailView reducer: sorting', () => {
  it('sorts ascending when not sorted by the key passed, then sorts descending when sorted by the column same column', () => {
    const state = getState();
    const column = createColumns<InboundShipmentItem>([
      'numberOfPacks',
    ])[0] as Column<InboundShipmentItem>;
    const action = InboundAction.onSortBy(column);
    const items = [
      { id: '1', numberOfPacks: 2 },
      { id: '2', numberOfPacks: 1 },
    ] as InboundShipmentItem[];
    state.draft.items = items;

    const newState = callReducer(action, state);

    expect(newState.draft.items).toEqual([
      expect.objectContaining({ id: '2' }),
      expect.objectContaining({ id: '1' }),
    ]);

    const newState2 = callReducer(action, newState);
    expect(newState2.draft.items).toEqual([
      expect.objectContaining({ id: '1' }),
      expect.objectContaining({ id: '2' }),
    ]);
  });
});

describe('DetailView reducer: updating lines', () => {
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

  it('marks any line that exists as being updated with a number of packs of zero as a delete', () => {
    const lineToUpdate = createLine('11', { numberOfPacks: 0 });
    const state1 = callReducer(OutboundAction.upsertLine(lineToUpdate));

    expect(findRow(state1, lineToUpdate.id)).toEqual(
      expect.objectContaining({
        isDeleted: true,
        isUpdated: false,
        isCreated: false,
      })
    );
  });

  it('deletes from state lines which are created and deleted through setting the packs to zero, as well as removing the summary item.', () => {
    // The two lines for a summary item.
    const lineToDelete = createLine('99', { itemId: '999', stockLineId: '99' });
    const lineToUpdate = createLine('991', {
      itemId: '999',
      stockLineId: '999',
      numberOfPacks: 99,
    });

    // Insert each of the lines
    const state1 = callReducer(OutboundAction.upsertLine(lineToDelete));
    expect(findRow(state1, lineToDelete.id)?.isCreated).toBe(true);

    const state2 = callReducer(OutboundAction.upsertLine(lineToUpdate), state1);
    expect(findRow(state2, lineToUpdate.id)?.isCreated).toBe(true);

    // One is deleted normally and is removed from state completely as it is not persisted to the
    // server.
    const state3 = callReducer(OutboundAction.deleteLine(lineToDelete), state2);
    expect(findRow(state3, lineToDelete.id)).toEqual(undefined);

    // Delete one by setting the number of packs to zero.
    const state4 = callReducer(
      OutboundAction.upsertLine({
        ...lineToUpdate,
        numberOfPacks: 0,
        isCreated: true,
      }),
      state3
    );
    expect(findRow(state4, lineToUpdate.id)).toEqual(undefined);

    const anySummaryItemsWithNoBatches = state4.draft.items.filter(
      summaryItem => {
        return Object.values(summaryItem.batches).length === 0;
      }
    );

    expect(anySummaryItemsWithNoBatches.length).toBe(0);
  });
});

describe('DetailView reducer: merging', () => {
  it('updates the client side line state by merging the server data into the client data lines, where the server data always wins', () => {
    const state: OutboundShipmentStateShape = getState();

    // Create some server data which is the same except every line has 99 numberOfPacks.
    // Then after merging, every line should have 99 numberOfPacks.
    const dataLines = [...flattenOutboundItems(state.draft.items)];
    const data = {
      ...placeholderInvoice,
      lines: dataLines.map(line => ({ ...line, numberOfPacks: 99 })),
    };

    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a numberOfPacks of 99. If there are any, the merge was wrong.

    expect(
      flattenOutboundItems(reducerResult.draft.items).filter(
        ({ numberOfPacks }) => numberOfPacks !== 99
      ).length
    ).toBe(0);
  });

  it('sets the correct flags for each line when merging new server state', () => {
    // The shipment has three lines. Two of them are new and one is updated.
    // When the server state is merged, the created lines should have the isCreated flag set to false
    // to indicate they have been persisted.

    const state = getState();
    const dataLines = state.draft.items
      .map(({ batches }) => {
        return Object.values(batches).map((batch, i) => {
          if (i === 0) return batch;
          return { ...batch, isCreated: true };
        });
      })
      .flat();

    const data = { ...placeholderInvoice, lines: dataLines };

    // Ensure there is at least one line which has is created set to false
    expect(data.lines.some(({ isCreated }) => !isCreated));
    // Ensure there is at least one line which has is created set to true
    expect(data.lines.some(({ isCreated }) => isCreated));

    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a numberOfPacks of 99. If there are any, the merge was wrong.

    expect(
      flattenOutboundItems(reducerResult.draft.items).every(
        ({ isCreated, isDeleted, isUpdated }) =>
          !isCreated && !isDeleted && isUpdated
      )
    ).toBe(true);
  });

  it('updates the client side draft state by merging the server invoice into the client data invoice draft, where the server data always wins', () => {
    const state = getState();

    // Create a server invoice which has a different comment and merge. The resulting invoice should be the same, except
    // for having the updated comment.
    const data = { ...state.draft, comment: 'josh' };
    const reducerResult = reducer(data, null)(state, DocumentAction.merge());

    // Check for any lines that don't have a numberOfPacks of 99. If there are any, the merge was wrong.

    Object.entries(reducerResult.draft).forEach(([key, value]) => {
      if (key === 'comment') {
        expect(value).toEqual('josh');
      } else if (key === 'items') {
        // Lines to be handled in their own tests as they're more complex.
        return;
      } else {
        expect(JSON.stringify(value)).toEqual(
          JSON.stringify(state.draft[key as keyof OutboundShipment])
        );
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
    const lineToDelete = createLine('99', { itemId: '99', stockLineId: '99' });
    const state1 = callReducer(OutboundAction.upsertLine(lineToDelete));
    const state2 = callReducer(OutboundAction.deleteLine(lineToDelete), state1);

    expect(findRow(state1, lineToDelete.id)).toBeTruthy();
    expect(findRow(state2, lineToDelete.id)).toBeFalsy();
  });

  it('deleting the last line of a summary item flags the summary item as deleted also', () => {
    const state1 = getState();
    const batches = state1.draft.items[0]?.batches;

    // Ensure the test is testing some lines.
    expect(batches).toBeTruthy();
    if (!batches) return;
    expect(Object.values(batches).length).toBeTruthy();

    const state2 = Object.values(batches).reduce((acc, value) => {
      return callReducer(OutboundAction.deleteLine(value), acc);
    }, state1);

    expect(state2.draft.items[0]?.isDeleted).toBe(true);
  });

  it('deleting the last line of a summary item where the line has not been persisted, removes the summary item from state', () => {
    const line = createLine('99', { itemId: '99' });

    const state1 = callReducer(OutboundAction.upsertLine(line));

    expect(findRow(state1, line.id)).toBeTruthy();
    expect(state1.draft.items.find(({ id }) => id === '99')).toBeTruthy();

    const state2 = callReducer(OutboundAction.deleteLine(line), state1);

    expect(findRow(state2, line.id)).toBeUndefined();
    expect(state2.draft.items.find(({ id }) => id === '99')).toBeUndefined();
  });

  it('inserting a line for a stock line which has an existing, persisted, but deleted, line, reuses that existing line', () => {
    // Mock an already existing and persisted line, which has been deleted client side.
    const existingLine = createLine('996', {
      itemId: 'item2',
      stockLineId: 'item2',
      numberOfPacks: 999,
    });

    const existingLine2 = createLine('998', {
      itemId: 'item2',
      stockLineId: 'item3',
      numberOfPacks: 999,
    });

    // Simulate the user adding a new line for the same stock line.
    const lineToCreate = createLine('993', {
      itemId: 'item2',
      stockLineId: 'item2',
      numberOfPacks: 1,
    });

    const data = { ...placeholderInvoice, lines: [existingLine] };

    const state1 = callReducer(OutboundAction.upsertLine(existingLine));
    expect(findRow(state1, existingLine.id)).toBeTruthy();

    // Mimic a 'save'
    const state2 = callReducer(DocumentAction.merge(), state1, data);
    expect(state2.draft.items.length).toBeTruthy();
    expect(
      state2.draft.items.every(({ batches }) =>
        Object.values(batches).every(({ isCreated }) => !isCreated)
      )
    );

    // Adding an additional line to mix it up a little
    const state3 = callReducer(
      OutboundAction.upsertLine(existingLine2),
      state2
    );

    expect(findRow(state3, existingLine.id)?.isCreated).toBe(false);
    expect(findRow(state3, existingLine2.id)?.isCreated).toBe(true);

    // Now deleting the line which has been persisted
    const state4 = callReducer(OutboundAction.deleteLine(existingLine), state3);
    // The line should still exist, but be flagged as deleted
    expect(findRow(state4, existingLine.id)).toBeTruthy();

    // Then upserting a line for the same stock line.
    const state5 = callReducer(OutboundAction.upsertLine(lineToCreate), state4);
    expect(findRow(state5, existingLine.id)).toBeTruthy();
  });
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

  it('ignores lines which are being inserted with zero number of packs', () => {
    const lineToInsert = createLine('999', {
      stockLineId: '999',
      itemId: '999',
      numberOfPacks: 0,
    });
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));

    expect(findRow(state, lineToInsert.id)).toBeUndefined();
  });

  it('inserts new lines under already existing summary items', () => {
    const lineToInsert = createLine('999', {
      stockLineId: '999',
      itemId: '1',
      numberOfPacks: 99,
    });
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));

    const summaryItem = state.draft.items.find(({ id }) => id === '1');

    expect(summaryItem?.batches[lineToInsert.id]).toEqual({
      ...lineToInsert,
      isCreated: true,
    });
  });

  it('ignores lines which are being inserted under an already existing summary item with zero number of packs', () => {
    const lineToInsert = createLine('999', {
      stockLineId: '999',
      itemId: '1',
      numberOfPacks: 0,
    });
    const state = callReducer(OutboundAction.upsertLine(lineToInsert));

    const summaryItem = state.draft.items.find(({ id }) => id === '1');

    expect(summaryItem?.batches[lineToInsert.id]).toBeUndefined();
  });
});
