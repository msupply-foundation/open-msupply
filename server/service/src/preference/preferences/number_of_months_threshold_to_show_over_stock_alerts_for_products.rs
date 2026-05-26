use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct NumberOfMonthsThresholdToShowOverStockAlertsForProducts;

impl Preference for NumberOfMonthsThresholdToShowOverStockAlertsForProducts {
    type Value = f64;

    fn key(&self) -> PrefKey {
        PrefKey::NumberOfMonthsThresholdToShowOverStockAlertsForProducts
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Store
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Float
    }
}
