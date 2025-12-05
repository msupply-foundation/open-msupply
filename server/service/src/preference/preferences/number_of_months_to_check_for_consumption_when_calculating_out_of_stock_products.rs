use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts;

impl Preference for NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }

    fn default_value(&self) -> Self::Value {
        3
    }
}
