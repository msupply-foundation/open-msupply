use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// When enabled, stock issued to an internal customer (another store on this
/// system) is priced at the supplying store's cost price rather than its sell
/// price, matching legacy 4D mSupply's `getCustomerLinePrice` for store-type
/// customers. The default price list and any customer discount are skipped for
/// those lines.
///
/// Because the invoice transfer processor carries the outbound sell price onto
/// the transferred inbound shipment as its cost price, turning this on makes
/// the receiving store's cost price the sending store's cost price (see #12517).
///
/// Off by default, which keeps the existing behaviour of charging internal
/// customers at the default price / stock sell price (see #9791).
pub struct TransferStockToInternalCustomersAtCostPrice;

impl Preference for TransferStockToInternalCustomersAtCostPrice {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::TransferStockToInternalCustomersAtCostPrice
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
