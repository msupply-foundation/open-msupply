use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct DaysInMonth;

impl Preference for DaysInMonth {
    type Value = f64;

    fn key(&self) -> PrefKey {
        PrefKey::DaysInMonth
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }
}
