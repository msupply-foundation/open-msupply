use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

/// Whether users may change a general internal order's target months of stock on a store
/// whose facility record carries a supply interval. Off, the target stays at the store's
/// supply interval + safety buffer. On unless set.
pub struct CanChangeTargetMonthsOfStock;

impl Preference for CanChangeTargetMonthsOfStock {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::CanChangeTargetMonthsOfStock
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }

    fn default_value(&self) -> Self::Value {
        true
    }
}
