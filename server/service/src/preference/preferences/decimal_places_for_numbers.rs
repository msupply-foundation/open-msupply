use crate::preference::{PrefKey, Preference, PreferenceType, PreferenceValueType};

pub struct DecimalPlacesForNumbers;

impl Preference for DecimalPlacesForNumbers {
    type Value = i32;

    fn key(&self) -> PrefKey {
        PrefKey::DecimalPlacesForNumbers
    }

    fn preference_type(&self) -> PreferenceType {
        PreferenceType::Global
    }

    fn value_type(&self) -> PreferenceValueType {
        PreferenceValueType::Integer
    }

    fn default_value(&self) -> Self::Value {
        2
    }
}
