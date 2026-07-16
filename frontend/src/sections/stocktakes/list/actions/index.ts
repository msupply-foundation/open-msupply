// The stocktakes-list actions — one self-contained component each (its own
// dialog + run). The list owns selection/toggles and applies the result via
// callbacks or navigation (kdd/action-modal): the bulk delete, and the
// initial-stocktake create offered from the empty state.
export { DeleteStocktakesAction } from './DeleteStocktakesAction';
export { CreateInitialStocktakeAction } from './CreateInitialStocktakeAction';
