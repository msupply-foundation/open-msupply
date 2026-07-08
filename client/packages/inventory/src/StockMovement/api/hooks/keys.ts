export const STOCK_MOVEMENT = 'stock-movement';
export const STOCK_MOVEMENT_DRAFT_LINES = 'stock-movement-draft-lines';

export const stockMovementKeys = {
  base: () => [STOCK_MOVEMENT] as const,
  detail: (id: string) => [STOCK_MOVEMENT, id] as const,
};
