// The shared program-indicators module (kdd/domain-modules): the Indicators
// tab both requisition verticals show — the merged line list with typed
// auto-saving cells — plus its definitions/values read. The surface is
// specced at internal-orders (S3 § Indicators tab); requisitions consumes it
// with the response-side variations (no customer breakdown). Each consumer
// runs the ProgramIndicatorValues query itself (its reporting identity —
// customerNameId — differs per side) and hands the nodes in.
export { ProgramIndicatorsTab } from './ProgramIndicatorsTab';
export { type IndicatorNode } from './indicators';
export { ProgramIndicatorValues } from './indicators.generated';
