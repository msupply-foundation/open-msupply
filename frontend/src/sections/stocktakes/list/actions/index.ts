// The stocktakes-list actions — one self-contained component each (its own button + confirm →
// deleting → success | error dialog + run). The list owns selection and applies the result via
// callbacks (kdd/action-modal). Currently just the bulk delete.
export { DeleteStocktakesAction } from './DeleteStocktakesAction';
