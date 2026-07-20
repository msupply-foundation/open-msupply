// The stocktake detail-view actions — one self-contained component each (its
// own button + confirm → working → success | error modal + run). The view owns
// rows/selection/errors and applies each action's result via callbacks
// (kdd/action-modal). The first three act on a selection; FinaliseAction is the
// status-footer's finalise (its trigger is the status-stepper split button, not
// a plain button).
export { DeleteLinesAction } from './DeleteLinesAction';
export { ChangeLocationAction } from './ChangeLocationAction';
export { ReduceToZeroAction } from './ReduceToZeroAction';
export { FinaliseAction } from './FinaliseAction';
// Record-level side-panel actions (act on the whole stocktake, not a line
// selection): the "Actions" section's Delete + Copy to clipboard.
export { DeleteStocktakeAction } from './DeleteStocktakeAction';
export { CopyStocktakeAction } from './CopyStocktakeAction';
// The header Export/Print trigger (opens the reports Select-a-form dialog).
export { ExportPrintAction } from './ExportPrintAction';
