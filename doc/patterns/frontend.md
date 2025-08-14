# Frontend Patterns

## API hooks

The current pattern uses a single hook that orchestrates query and mutation operations with draft state management, providing a unified interface for CRUD operations on domain entities.

## Core Pattern Structure

### 1. Hook Organization

Each domain entity has a main hook that combines all operations:

```typescript
export function useStockLine(id?: string) {
  // Internal hooks for operations
  const { data, isLoading, error } = useGet(id ?? '');
  const { mutateAsync: createMutation, isLoading: isCreating, error: createError } = useCreate();
  const { mutateAsync: updateMutation, isLoading: isUpdating, error: updateError } = useUpdate(id ?? '');
  
  // Draft state management
  const { patch, updatePatch, resetDraft, isDirty } = usePatchState<DraftStockLine>(data?.nodes[0] ?? {});
  
  // Wrapper functions and return
}
```

### 2. Internal Hook Pattern

Example internal hooks that handle specific operations:

- **`useGet`** - Query hook for fetching data
- **`useCreate`** - Mutation hook for creating new entities  
- **`useUpdate`** - Mutation hook for updating existing entities

Each is defined as a private function within the same file.

## Key Components

### Draft State Management

Uses `usePatchState` for optimistic updates and form state:

```typescript
const { patch, updatePatch, resetDraft, isDirty } =
  usePatchState<DraftStockLine>(data?.nodes[0] ?? {});

const draft: DraftStockLine = data
  ? { ...defaultDraftStockLine, ...data?.nodes[0], ...patch }
  : { ...defaultDraftStockLine, ...patch };
```

### Default Draft State

Each entity defines a complete default state object:

```typescript
const defaultDraftStockLine: DraftStockLine = {
  __typename: 'StockLineNode',
  id: '',
  itemId: '',
  onHold: false,
  packSize: 0,
  sellPricePerPack: 0,
  costPricePerPack: 0,
  totalNumberOfPacks: 0,
  availableNumberOfPacks: 0,
  storeId: '',
  ... // other fields
};
```

### GraphQL Integration

Uses a domain-specific GraphQL hook:

```typescript
const { stockApi, storeId, queryClient } = useStockGraphQL();

// Query usage
const result = await stockApi.stockLine({ id, storeId });

// Mutation usage
await stockApi.insertStockLine({ storeId, input });
```

## Implementation Pattern

### Query Hook (`useGet`)

```typescript
const useGet = (id: string) => {
  const { stockApi, storeId } = useStockGraphQL();

  const queryFn = async () => {
    const result = await stockApi.stockLine({ id, storeId });

    if (result.stockLines.__typename === 'StockLineConnector') {
      return result.stockLines;
    }
  };

  const query = useQuery({
    queryKey: [STOCK_LINE, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};
```

### Create Hook (`useCreate`)

```typescript
const useCreate = () => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async ({
    itemId,
    reasonOption,
    packSize,
    totalNumberOfPacks,
    barcode,
    ... // other fields
  }: DraftStockLine) => {
    return await stockApi.insertStockLine({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        itemId,
        packSize,
        barcode,
        ... // map other fields
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      // Stock line list needs to be re-fetched to include the new stock line
      queryClient.invalidateQueries([STOCK_LINE]),
  });
};
```

### Update Hook (`useUpdate`)

```typescript
const useUpdate = (id: string) => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async ({
    barcode,
    batch,
    expiryDate,
    sellPricePerPack,
    costPricePerPack,
    ...
  }: Partial<DraftStockLine>) => {
    const result = await stockApi.updateStockLine({
      input: {
        id,
        barcode,
        batch,
        costPricePerPack,
        expiryDate,
        sellPricePerPack,
        ...
      },
      storeId,
    });

    const { updateStockLine } = result;

    if (updateStockLine?.__typename === 'StockLineNode') {
      return updateStockLine;
    }

    throw new Error('Unable to update stock line');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([STOCK_LINE, id]),
  });
};
```

## Wrapper Functions

The main hook provides convenient wrapper functions that handle draft state cleanup:

```typescript
const create = async () => {
  const result = await createMutation(draft);
  resetDraft();
  return result;
};

const update = async () => {
  await updateMutation(patch);
  resetDraft();
};
```

## Return Structure

Consistent return pattern across all domain hooks:

```typescript
return {
  query: { data: data?.nodes[0], isLoading, error },
  create: { create, isCreating, createError },
  update: { update, isUpdating, updateError },
  draft,
  resetDraft,
  isDirty,
  updatePatch,
};
```

## Usage Example

```typescript
function StockLine({ stockLineId }: { stockLineId?: string }) {
  const {
    query: { data, isLoading },
    create: { create, isCreating },
    update: { update, isUpdating },
    draft,
    updatePatch,
    isDirty
  } = useStockLine(stockLineId);
}
```