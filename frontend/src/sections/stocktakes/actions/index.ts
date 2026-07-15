// The stocktake detail-view selection actions — one self-contained component each (footer button +
// confirm → working → success | error modal + run). The view owns rows/selection/errors and applies
// each action's result via callbacks (kdd/action-modal).
export { DeleteLinesAction } from './DeleteLinesAction';
export { ChangeLocationAction } from './ChangeLocationAction';
export { ReduceToZeroAction } from './ReduceToZeroAction';
