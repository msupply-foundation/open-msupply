import { ManagedTableState, updateSavedState } from './utils';

// Mock localStorage
const localStorageMock = (() => {
  let tableState: string | null = null;

  return {
    // mocks
    getItem: jest.fn((_: string) => tableState),
    setItem: jest.fn((_: string, value: string) => {
      tableState = value;
    }),
    removeItem: jest.fn((_: string) => {
      tableState = null;
    }),

    // test helpers
    clear: () => {
      tableState = null;
    },
    initialState: (val: ManagedTableState) => {
      tableState = JSON.stringify(val);
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('updateSavedState', () => {
  const tableId = 'test-table';
  const storageKey = `@openmsupply-client/tables/${tableId}`;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should save new state when no existing state exists', () => {
    const newState = {
      density: 'compact' as const,
      columnVisibility: { column1: false },
    };

    updateSavedState(tableId, newState);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(newState)
    );
  });

  it('should merge new state with existing state', () => {
    localStorageMock.initialState({
      density: 'comfortable',
      columnVisibility: { column1: true, column2: false },
    });

    // Act
    updateSavedState(tableId, {
      density: 'compact',
      columnPinning: { left: ['column1'] },
    });

    // Assert
    const expectedMergedState = {
      density: 'compact',
      columnVisibility: { column1: true, column2: false },
      columnPinning: { left: ['column1'] },
    };
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(expectedMergedState)
    );
  });

  it('should remove keys with undefined values', () => {
    localStorageMock.initialState({
      density: 'comfortable',
      columnVisibility: { column1: true },
      columnPinning: { left: ['column1'] },
    });

    // Act
    updateSavedState(tableId, {
      columnPinning: undefined,
    });

    // Assert
    const expectedState = {
      density: 'comfortable',
      columnVisibility: { column1: true },
    };
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(expectedState)
    );
  });

  it('should clear localStorage when merged state is empty/all set to undefined', () => {
    localStorageMock.initialState({ density: 'comfortable' });

    // Update with undefined to effectively remove the density
    updateSavedState(tableId, { density: undefined });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(storageKey);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should not update localStorage if state is unchanged', () => {
    localStorageMock.initialState({
      density: 'comfortable',
      columnVisibility: { column1: false },
    });

    // Try to update with the same state
    updateSavedState(tableId, {
      columnVisibility: { column1: false },
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it('should do nothing with empty new state object', () => {
    localStorageMock.initialState({ density: 'comfortable' });

    updateSavedState(tableId, {});

    // Should not change anything since empty object doesn't override existing state
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it('should handle malformed existing localStorage data', () => {
    // Set malformed JSON in localStorage
    localStorageMock.setItem(storageKey, 'invalid-json');

    const newState: ManagedTableState = { density: 'compact' };

    // Should not throw an error and should save the new state
    expect(() => updateSavedState(tableId, newState)).not.toThrow();

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify(newState)
    );
  });
});
