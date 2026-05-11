use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct AdjustForNumberOfDaysOutOfStock;

impl Preference for AdjustForNumberOfDaysOutOfStock {
    type Value = bool;

    fn key(&self) -> PrefKey {
        PrefKey::AdjustForNumberOfDaysOutOfStock
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Boolean
    }
}
