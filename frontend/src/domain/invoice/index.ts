// Invoice-domain modals both shipment verticals host: the service-charges
// editor (outbound S5 / inbound S6) and the change-currency modal. The
// modules own the shared surface + lookups only — each vertical supplies its
// own writes as plain props (kdd/explicit-composition). Also home to the
// invoice-status-options display gate (statusGate) the invoice verticals
// share, and to deleteRejection — why a cascading invoice delete was refused,
// which reads the same on every vertical whose delete walks the lines. The
// returns-list bulk delete lives here too: customer and supplier returns run
// the same dialog, differing only in the mutation and the stock notice.
export {
  ServiceChargesModal,
  type ServiceChargeSeed,
  type ServiceChargeSaveResult,
  type ServiceChargesModalProps,
} from './ServiceChargesModal';
export {
  CurrencyModal,
  type CurrencyModalProps,
  type CurrencySaveResult,
} from './CurrencyModal';
export { filterByStatusPreference, currentStep } from './statusGate';
export { deleteRejection, type DeleteRejection } from './deleteRejection';
export {
  DeleteReturnsAction,
  type DeleteReturnsActionProps,
  type DeleteReturnOutcome,
} from './DeleteReturnsAction';
export {
  splitServiceChargeBatch,
  chargeTotalAfterTax,
  type ServiceChargeBatch,
  type ServiceChargeDraft,
  type ServiceChargeWrite,
} from './serviceChargeBatch';
