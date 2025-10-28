use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct NumberOfMonthsThresholdToShowLowStockAlertsForProducts;

impl Preference for NumberOfMonthsThresholdToShowLowStockAlertsForProducts {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::NumberOfMonthsThresholdToShowLowStockAlertsForProducts
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
