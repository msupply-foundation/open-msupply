// Invoice-domain modals both shipment verticals host: the service-charges
// editor (outbound S5 / inbound S6) and the change-currency modal. The
// modules own the shared surface + lookups only — each vertical supplies its
// own writes as plain props (kdd/explicit-composition). Also home to the
// invoice-status-options display gate (statusGate) the invoice verticals
// share.
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
export {
  splitServiceChargeBatch,
  chargeTotalAfterTax,
  type ServiceChargeBatch,
  type ServiceChargeDraft,
  type ServiceChargeWrite,
} from './serviceChargeBatch';
